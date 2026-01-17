import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const CANCELLATION_THRESHOLD = 3; // Number of cancellations to trigger alert
        const TIME_WINDOW_DAYS = 30; // Look back 30 days

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - TIME_WINDOW_DAYS);

        // Get all cancelled bookings in the last 30 days
        const bookings = await base44.asServiceRole.entities.Booking.filter({
            status: 'cancelled'
        });

        // Filter by date and group by user
        const userCancellations = {};
        
        bookings.forEach(booking => {
            const createdDate = new Date(booking.created_date);
            if (createdDate >= thirtyDaysAgo) {
                // Track both companions and seekers who cancel
                const companionId = booking.companion_id;
                const seekerId = booking.seeker_id;
                
                if (companionId) {
                    userCancellations[companionId] = userCancellations[companionId] || [];
                    userCancellations[companionId].push(booking);
                }
                
                if (seekerId) {
                    userCancellations[seekerId] = userCancellations[seekerId] || [];
                    userCancellations[seekerId].push(booking);
                }
            }
        });

        const alerts = [];

        // Check each user against threshold
        for (const [userId, cancellations] of Object.entries(userCancellations)) {
            if (cancellations.length >= CANCELLATION_THRESHOLD) {
                // Check if alert already exists
                const existingAlerts = await base44.asServiceRole.entities.FraudAlert.filter({
                    user_id: userId,
                    alert_type: 'repeated_cancellations',
                    status: 'new'
                });

                if (existingAlerts.length === 0) {
                    // Get user details
                    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
                    const userData = users[0];

                    const alert = await base44.asServiceRole.entities.FraudAlert.create({
                        user_id: userId,
                        user_name: userData?.display_name || userData?.full_name,
                        user_email: userData?.email,
                        alert_type: 'repeated_cancellations',
                        severity: cancellations.length >= 5 ? 'high' : 'medium',
                        cancellation_count: cancellations.length,
                        details: {
                            time_window_days: TIME_WINDOW_DAYS,
                            booking_ids: cancellations.map(b => b.id)
                        }
                    });

                    alerts.push(alert);

                    // Send Slack notification
                    try {
                        const accessToken = await base44.asServiceRole.connectors.getAccessToken("slack");
                        
                        await fetch('https://slack.com/api/chat.postMessage', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                channel: '#fraud-alerts',
                                text: `🚨 *Repeated Cancellations Detected*\n\n*User:* ${userData?.display_name || userData?.full_name} (${userData?.email})\n*Cancellations:* ${cancellations.length} in the last ${TIME_WINDOW_DAYS} days\n*Severity:* ${alert.severity.toUpperCase()}`
                            })
                        });
                    } catch (slackError) {
                        console.error('Failed to send Slack notification:', slackError);
                    }
                }
            }
        }

        return Response.json({ 
            success: true, 
            alerts_created: alerts.length,
            checked_users: Object.keys(userCancellations).length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});