import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { eventId } = await req.json();

    // Get event and all participants
    const event = await base44.asServiceRole.entities.GroupEvent.filter({ id: eventId }, '', 1);
    if (!event || event.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = event[0];
    const participants = await base44.asServiceRole.entities.GroupParticipant.filter({ event_id: eventId }, '', 500);

    if (participants.length === 0) {
      return Response.json({ error: 'No participants to assign' }, { status: 400 });
    }

    // Get user details for all participants
    const participantsWithDetails = await Promise.all(
      participants.map(async (p) => {
        const userProfile = await base44.asServiceRole.functions.invoke('getUserProfile', { userId: p.user_id });
        return {
          ...p,
          user_age: userProfile?.age || 30,
          user_gender: userProfile?.gender || 'other',
          personality_type: userProfile?.personality_type || 'ambivert',
          interests: userProfile?.interests || []
        };
      })
    );

    // AI Matching Algorithm
    const tablesCount = Math.ceil(participantsWithDetails.length / 4);
    const tables = Array(tablesCount).fill(null).map(() => []);

    // Separate by gender
    const males = participantsWithDetails.filter(p => p.user_gender === 'male');
    const females = participantsWithDetails.filter(p => p.user_gender === 'female');
    const others = participantsWithDetails.filter(p => p.user_gender === 'other');

    // Shuffle function
    const shuffle = (arr) => {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

    // Sort by personality to mix types
    const sortByPersonality = (arr) => {
      const order = { extrovert: 0, ambivert: 1, introvert: 2 };
      return arr.sort((a, b) => (order[a.personality_type] || 1) - (order[b.personality_type] || 1));
    };

    const sortedMales = sortByPersonality(shuffle(males));
    const sortedFemales = sortByPersonality(shuffle(females));
    const sortedOthers = sortByPersonality(shuffle(others));

    // Distribute to tables maintaining ~60% male, 40% female ratio where possible
    let tableIdx = 0;
    let maleIdx = 0, femaleIdx = 0, otherIdx = 0;

    const selectedParticipants = [];
    const maxPerTable = 4;

    while (selectedParticipants.length < Math.min(participantsWithDetails.length, tablesCount * maxPerTable)) {
      const currentTable = tables[tableIdx];

      if (currentTable.length >= maxPerTable) {
        tableIdx++;
        continue;
      }

      // Try to maintain 60% male, 40% female
      const maleTarget = Math.ceil(currentTable.length * 0.6);
      const femaleTarget = Math.ceil(currentTable.length * 0.4);
      const maleCount = currentTable.filter(p => p.user_gender === 'male').length;
      const femaleCount = currentTable.filter(p => p.user_gender === 'female').length;

      let participant = null;

      if (maleCount < maleTarget && maleIdx < sortedMales.length) {
        participant = sortedMales[maleIdx++];
      } else if (femaleIdx < sortedFemales.length) {
        participant = sortedFemales[femaleIdx++];
      } else if (otherIdx < sortedOthers.length) {
        participant = sortedOthers[otherIdx++];
      } else if (maleIdx < sortedMales.length) {
        participant = sortedMales[maleIdx++];
      }

      if (participant) {
        currentTable.push(participant);
        selectedParticipants.push(participant.id);
      }
    }

    // Update assignments in database
    const updates = [];

    // Update selected participants with table assignments
    for (let t = 0; t < tables.length; t++) {
      for (let p = 0; p < tables[t].length; p++) {
        const participant = tables[t][p];
        updates.push(
          base44.asServiceRole.entities.GroupParticipant.update(participant.id, {
            table_number: t + 1,
            status: 'confirmed'
          })
        );
      }
    }

    // Mark non-selected participants as not_selected for refund
    const nonSelectedIds = participantsWithDetails
      .filter(p => !selectedParticipants.includes(p.id))
      .map(p => p.id);

    for (const pId of nonSelectedIds) {
      updates.push(
        base44.asServiceRole.entities.GroupParticipant.update(pId, {
          status: 'not_selected'
        })
      );
    }

    await Promise.all(updates);

    // Update event status
    await base44.asServiceRole.entities.GroupEvent.update(eventId, {
      tables_assigned: true,
      assignment_date: new Date().toISOString(),
      status: 'confirmed'
    });

    // Send notifications
    const selectedNotifications = selectedParticipants.map(pId => {
      const participant = participantsWithDetails.find(p => p.id === pId);
      return base44.asServiceRole.entities.Notification.create({
        user_id: participant.user_id,
        type: 'group_event_selected',
        title: 'You\'re in!',
        message: `Congrats! You've been selected for ${eventData.title}. See you on ${eventData.date} at ${eventData.time}!`,
        action_url: `GroupEvents?event=${eventId}`
      });
    });

    const refundNotifications = nonSelectedIds.map(pId => {
      const participant = participantsWithDetails.find(p => p.id === pId);
      return base44.asServiceRole.entities.Notification.create({
        user_id: participant.user_id,
        type: 'group_event_not_selected',
        title: 'Better luck next time',
        message: `Unfortunately, you weren't selected for this event, but we've refunded your payment. Check out other events!`,
        action_url: 'GroupEvents'
      });
    });

    await Promise.all([...selectedNotifications, ...refundNotifications]);

    return Response.json({
      success: true,
      tablesCreated: tables.length,
      selectedCount: selectedParticipants.length,
      refundedCount: nonSelectedIds.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});