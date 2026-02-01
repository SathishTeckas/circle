import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Only process booking creates
        if (event?.type !== 'create' || !data) {
            return Response.json({ success: true, message: 'No action needed' });
        }

        const booking = data;
        
        // Get companion and seeker details
        const [companions, seekers] = await Promise.all([
            base44.asServiceRole.entities.User.filter({ id: booking.companion_id }),
            base44.asServiceRole.entities.User.filter({ id: booking.seeker_id })
        ]);

        const companion = companions[0];
        const seeker = seekers[0];

        if (!companion || !seeker) {
            return Response.json({ success: false, message: 'Users not found' });
        }

        const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : 'TBD';
        
        const formatCurrency = (amount) => `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;

        // Send email to Companion
        const companionEmailBody = `
Hello ${companion.display_name || companion.full_name}! 🎉

You have a new booking request!

📅 Date: ${bookingDate}
⏰ Time: ${booking.start_time} - ${booking.end_time}
⏱️ Duration: ${booking.duration_hours} hour(s)
📍 Location: ${booking.venue_name || booking.area || 'To be confirmed'}
💰 Earnings: ${formatCurrency(booking.base_price)}

Seeker: ${seeker.display_name || seeker.full_name}

Please review and respond to this booking request in the app as soon as possible.

Best regards,
Circle Team
        `.trim();

        // Send email to Seeker
        const seekerEmailBody = `
Hello ${seeker.display_name || seeker.full_name}! 🎉

Your booking request has been submitted successfully!

📅 Date: ${bookingDate}
⏰ Time: ${booking.start_time} - ${booking.end_time}
⏱️ Duration: ${booking.duration_hours} hour(s)
📍 Location: ${booking.venue_name || booking.area || 'To be confirmed'}
💰 Amount: ${formatCurrency(booking.total_amount)}

Companion: ${companion.display_name || companion.full_name}

The companion will review your request and respond shortly. You'll receive a notification once they accept or decline.

Best regards,
Circle Team
        `.trim();

        // Send emails
        const emailPromises = [];
        
        if (companion.email) {
            emailPromises.push(
                base44.asServiceRole.integrations.Core.SendEmail({
                    to: companion.email,
                    subject: `🔔 New Booking Request from ${seeker.display_name || seeker.full_name}`,
                    body: companionEmailBody,
                    from_name: 'Circle'
                })
            );
        }

        if (seeker.email) {
            emailPromises.push(
                base44.asServiceRole.integrations.Core.SendEmail({
                    to: seeker.email,
                    subject: `✅ Booking Request Submitted - ${bookingDate}`,
                    body: seekerEmailBody,
                    from_name: 'Circle'
                })
            );
        }

        await Promise.all(emailPromises);

        // Send Slack notification to admin channel (if configured)
        try {
            const slackMessage = `🆕 *New Booking Created*\n• Seeker: ${seeker.display_name || seeker.full_name}\n• Companion: ${companion.display_name || companion.full_name}\n• Date: ${bookingDate}\n• Amount: ${formatCurrency(booking.total_amount)}`;
            
            // You can configure a specific channel in the future
            // For now, this is optional
        } catch (slackError) {
            console.log('Slack notification skipped:', slackError.message);
        }

        return Response.json({ 
            success: true, 
            message: 'Notifications sent',
            emailsSent: emailPromises.length
        });

    } catch (error) {
        console.error('Notification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});