import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    console.log('Starting feedback request process...');

    // Find all completed events without feedback requests sent
    const completedEvents = await base44.asServiceRole.entities.GroupEvent.filter({
      status: 'completed'
    });

    console.log(`Found ${completedEvents.length} completed events`);

    let notificationsSent = 0;

    for (const event of completedEvents) {
      // Get confirmed participants for this event
      const participants = await base44.asServiceRole.entities.GroupParticipant.filter({
        event_id: event.id,
        status: 'confirmed'
      });

      console.log(`Event ${event.title}: ${participants.length} confirmed participants`);

      for (const participant of participants) {
        // Check if feedback already exists
        const existingFeedback = await base44.asServiceRole.entities.EventFeedback.filter({
          event_id: event.id,
          participant_id: participant.user_id
        });

        if (existingFeedback.length > 0) {
          continue; // Skip if already submitted
        }

        // Create notification for feedback request
        await base44.asServiceRole.entities.Notification.create({
          user_id: participant.user_id,
          type: 'booking_reminder',
          title: 'Share Your Event Feedback',
          message: `How was ${event.title}? Your feedback helps us create better events and matches for you!`,
          action_url: `/EventFeedback?eventId=${event.id}`,
          read: false
        });

        // Optionally send email
        if (participant.user_email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: participant.user_email,
              subject: `We'd love your feedback on ${event.title}`,
              body: `Hi ${participant.user_name},

Thank you for attending ${event.title}! We hope you had a great time.

Your feedback is incredibly valuable to us. It helps us:
- Improve our participant matching algorithm
- Create better event formats
- Build a stronger community

Please take 2 minutes to share your thoughts: [Feedback Link]

Thank you for being part of our community!

Best regards,
The Circle Team`
            });
          } catch (emailError) {
            console.log(`Email send failed for ${participant.user_email}:`, emailError.message);
          }
        }

        notificationsSent++;
      }
    }

    console.log(`Sent ${notificationsSent} feedback requests`);

    return Response.json({
      success: true,
      events_processed: completedEvents.length,
      notifications_sent: notificationsSent
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});