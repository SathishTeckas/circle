import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Missing eventId' }, { status: 400 });
    }

    // Fetch event details
    const event = await base44.entities.GroupEvent.filter({ id: eventId });
    if (!event || event.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = event[0];
    console.log(`Processing event: ${eventData.title}`);

    // Fetch all registered participants
    const participants = await base44.entities.GroupParticipant.filter({
      event_id: eventId,
      status: 'registered'
    });

    if (participants.length === 0) {
      console.log('No registered participants');
      return Response.json({ message: 'No participants to process' });
    }

    console.log(`Found ${participants.length} registered participants`);

    // Check if participants meet minimum or maximum requirements
    if (participants.length < eventData.max_participants) {
      // Cancel event and refund everyone
      console.log(`Not enough participants (${participants.length}/${eventData.max_participants}). Cancelling event.`);
      
      const refundList = [];
      for (const participant of participants) {
        await base44.asServiceRole.entities.GroupParticipant.update(participant.id, {
          status: 'refunded',
          payment_status: 'refunded'
        });
        refundList.push({
          email: participant.user_email,
          name: participant.user_name,
          amount: participant.amount_paid
        });
      }

      await base44.asServiceRole.entities.GroupEvent.update(eventId, {
        status: 'cancelled'
      });

      return Response.json({
        success: true,
        cancelled: true,
        reason: 'Not enough participants',
        refund_count: refundList.length,
        refunds: refundList
      });
    }

    if (participants.length === eventData.max_participants) {
      // All participants get in
      console.log(`Exact participants (${participants.length}). All selected.`);
      
      const groupChatName = `${eventData.title} - All Participants`;
      for (const participant of participants) {
        await base44.asServiceRole.entities.GroupParticipant.update(participant.id, {
          selected_for_event: true,
          status: 'confirmed',
          group_chat_id: groupChatName
        });
      }

      await base44.asServiceRole.entities.GroupEvent.update(eventId, {
        status: 'confirmed',
        tables_assigned: true,
        assignment_date: new Date().toISOString()
      });

      return Response.json({
        success: true,
        all_selected: true,
        selected_count: participants.length,
        refund_count: 0
      });
    }

    // More than max - AI selection required
    console.log(`Overbooked (${participants.length}/${eventData.max_participants}). Using AI selection.`);

    // Fetch user details for all participants
    const userIds = participants.map(p => p.user_id);
    const users = await base44.entities.User.filter({});
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u;
    });

    // Fetch past feedback to improve matching
    const pastFeedback = await base44.asServiceRole.entities.EventFeedback.filter({}, '-created_date', 100);
    
    // Analyze feedback patterns
    const feedbackInsights = pastFeedback.length > 0 ? `

PAST EVENT INSIGHTS (from ${pastFeedback.length} feedback responses):
- Average matching quality: ${(pastFeedback.reduce((sum, f) => sum + f.matching_quality, 0) / pastFeedback.length).toFixed(1)}/5
- Average personality mix rating: ${(pastFeedback.reduce((sum, f) => sum + f.personality_mix_rating, 0) / pastFeedback.length).toFixed(1)}/5
- ${pastFeedback.filter(f => f.met_compatible_people).length}/${pastFeedback.length} said they met compatible people
- Preferred group size: ${pastFeedback.filter(f => f.preferred_group_size === 'smaller').length} want smaller, ${pastFeedback.filter(f => f.preferred_group_size === 'same').length} happy with current
- Age diversity: ${pastFeedback.filter(f => f.age_diversity_preference === 'good_mix').length} liked the mix, ${pastFeedback.filter(f => f.age_diversity_preference === 'more_similar').length} want similar ages

SUCCESSFUL PAIRINGS (people who connected):
${pastFeedback.filter(f => f.liked_participants?.length > 0).slice(0, 10).map(f => {
  const feedbackUser = userMap[f.participant_id];
  const likedUsers = f.liked_participants.map(id => userMap[id]).filter(Boolean);
  if (!feedbackUser || likedUsers.length === 0) return '';
  return `- ${feedbackUser.personality} person (${feedbackUser.gender}, age ${feedbackUser.date_of_birth ? Math.floor((new Date() - new Date(feedbackUser.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'unknown'}) connected well with: ${likedUsers.map(u => `${u.personality} (${u.gender})`).join(', ')}`;
}).filter(Boolean).join('\n')}

Use these insights to create better matches.
` : '';

    // Use AI to select balanced participants with random variety
    const selectionPrompt = `
You are a social event matching algorithm. Given a list of participants, select EXACTLY ${eventData.max_participants} participants based on:
1. Gender balance: STRICT 60:40 male to female ratio (6 males, 4 females for 10 people, adjust proportionally)
2. Age range compatibility (${eventData.age_range_min} - ${eventData.age_range_max} years) - mix different ages
3. Personality diversity (mix different personalities - introverts, extroverts, adventurous, calm)
4. Language preferences (prioritize those who speak: ${eventData.language})
5. Interests & Hobbies: Create diverse mix of interests to enable varied conversations
6. RANDOMNESS: Add variety by not always picking the same type - mix it up
7. LEARN FROM PAST FEEDBACK: Use the insights below to create successful personality pairings

Participants data:
${participants.map(p => {
  const userData = userMap[p.user_id];
  const ageRange = userData?.date_of_birth ? Math.floor((new Date() - new Date(userData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'unknown';
  return `
ID: ${p.user_id}
Name: ${p.user_name}
Gender: ${userData?.gender || 'unknown'}
Age: ${ageRange}
Personality: ${userData?.personality || 'unknown'}
Languages: ${(userData?.languages || []).join(', ') || 'unknown'}`;
}).join('\n---\n')}
${feedbackInsights}

Return a JSON object with:
{
  "selected_ids": ["user_id_1", "user_id_2", ...],
  "reasoning": "Brief explanation of selection based on criteria and past feedback insights"
}

Make sure the selected count equals or is less than ${eventData.max_participants}.
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: selectionPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          selected_ids: {
            type: 'array',
            items: { type: 'string' }
          },
          reasoning: { type: 'string' }
        }
      }
    });

    const selectedIds = aiResponse.selected_ids || [];
    console.log(`AI selected ${selectedIds.length} participants`);

    // Create group chat name
    const groupChatName = `${eventData.title} - Table Assignments`;

    // Update participants status
    const refundList = [];
    for (const participant of participants) {
      if (selectedIds.includes(participant.user_id)) {
        // Mark as confirmed and selected
        await base44.asServiceRole.entities.GroupParticipant.update(participant.id, {
          selected_for_event: true,
          status: 'confirmed',
          group_chat_id: groupChatName
        });
      } else {
        // Mark for refund
        await base44.asServiceRole.entities.GroupParticipant.update(participant.id, {
          status: 'refunded',
          payment_status: 'refunded'
        });
        refundList.push({
          email: participant.user_email,
          name: participant.user_name,
          amount: participant.amount_paid
        });
      }
    }

    // Update event status to confirmed (participants selected)
    await base44.asServiceRole.entities.GroupEvent.update(eventId, {
      status: 'confirmed',
      tables_assigned: true,
      assignment_date: new Date().toISOString()
    });

    // Create group chat in Slack for selected participants
    const selectedParticipants = participants.filter(p => selectedIds.includes(p.user_id));
    const slackUserEmails = selectedParticipants.map(p => p.user_email).filter(Boolean);

    if (slackUserEmails.length > 0) {
      try {
        // Get Slack access token
        const slackToken = await base44.asServiceRole.connectors.getAccessToken('slack');
        
        // Create private channel
        const channelResponse = await fetch('https://slack.com/api/conversations.create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: groupChatName.toLowerCase().replace(/\s+/g, '-').slice(0, 80),
            is_private: true,
            user_ids: slackUserEmails
          })
        });

        const channelData = await channelResponse.json();
        if (channelData.ok) {
          console.log(`Created Slack channel: ${channelData.channel.id}`);
          
          // Send welcome message
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${slackToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              channel: channelData.channel.id,
              text: `Welcome to ${eventData.title}! 🎉\n\nYou've been selected for this event. Event details:\n📅 Date: ${eventData.date}\n🕐 Time: ${eventData.time}\n📍 Venue: ${eventData.venue_name}\n\nFeel free to introduce yourself and get to know fellow participants!`
            })
          });
        }
      } catch (slackError) {
        console.log('Slack integration skipped or failed:', slackError.message);
      }
    }

    return Response.json({
      success: true,
      selected_count: selectedIds.length,
      refund_count: refundList.length,
      refunds: refundList,
      reasoning: aiResponse.reasoning
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});