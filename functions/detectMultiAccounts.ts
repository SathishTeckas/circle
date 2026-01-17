import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all users
        const users = await base44.asServiceRole.entities.User.filter({});

        const ipGroups = {};
        const phoneGroups = {};
        const alerts = [];

        // Group users by shared attributes
        users.forEach(user => {
            // Group by IP address (if tracked)
            if (user.last_login_ip) {
                if (!ipGroups[user.last_login_ip]) {
                    ipGroups[user.last_login_ip] = [];
                }
                ipGroups[user.last_login_ip].push(user);
            }

            // Group by phone number patterns
            if (user.phone) {
                const phoneKey = user.phone.replace(/\D/g, '').slice(-10); // Last 10 digits
                if (!phoneGroups[phoneKey]) {
                    phoneGroups[phoneKey] = [];
                }
                phoneGroups[phoneKey].push(user);
            }
        });

        // Detect suspicious IP groupings
        for (const [ip, groupedUsers] of Object.entries(ipGroups)) {
            if (groupedUsers.length >= 3) {
                // Check if alert already exists
                const userIds = groupedUsers.map(u => u.id).sort().join(',');
                const existingAlerts = await base44.asServiceRole.entities.FraudAlert.filter({
                    alert_type: 'multi_account',
                    status: 'new'
                });

                const isDuplicate = existingAlerts.some(alert => {
                    const existingIds = (alert.related_user_ids || []).sort().join(',');
                    return existingIds === userIds;
                });

                if (!isDuplicate) {
                    const alert = await base44.asServiceRole.entities.FraudAlert.create({
                        user_id: groupedUsers[0].id,
                        user_name: groupedUsers[0].display_name || groupedUsers[0].full_name,
                        user_email: groupedUsers[0].email,
                        alert_type: 'multi_account',
                        severity: groupedUsers.length >= 5 ? 'critical' : 'high',
                        related_user_ids: groupedUsers.map(u => u.id),
                        details: {
                            detection_method: 'shared_ip',
                            shared_value: ip,
                            account_count: groupedUsers.length,
                            accounts: groupedUsers.map(u => ({
                                id: u.id,
                                name: u.display_name || u.full_name,
                                email: u.email,
                                created: u.created_date
                            }))
                        }
                    });

                    alerts.push(alert);

                    // Send Slack notification
                    try {
                        const accessToken = await base44.asServiceRole.connectors.getAccessToken("slack");
                        
                        const accountsList = groupedUsers.map(u => 
                            `• ${u.display_name || u.full_name} (${u.email})`
                        ).join('\n');

                        await fetch('https://slack.com/api/chat.postMessage', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                channel: '#fraud-alerts',
                                text: `🔴 *Multi-Account Detection*\n\n*Method:* Shared IP Address\n*IP:* ${ip}\n*Accounts Found:* ${groupedUsers.length}\n*Severity:* ${alert.severity.toUpperCase()}\n\n*Accounts:*\n${accountsList}`
                            })
                        });
                    } catch (slackError) {
                        console.error('Failed to send Slack notification:', slackError);
                    }
                }
            }
        }

        // Detect suspicious phone number patterns
        for (const [phone, groupedUsers] of Object.entries(phoneGroups)) {
            if (groupedUsers.length >= 2) {
                const userIds = groupedUsers.map(u => u.id).sort().join(',');
                const existingAlerts = await base44.asServiceRole.entities.FraudAlert.filter({
                    alert_type: 'multi_account',
                    status: 'new'
                });

                const isDuplicate = existingAlerts.some(alert => {
                    const existingIds = (alert.related_user_ids || []).sort().join(',');
                    return existingIds === userIds;
                });

                if (!isDuplicate) {
                    const alert = await base44.asServiceRole.entities.FraudAlert.create({
                        user_id: groupedUsers[0].id,
                        user_name: groupedUsers[0].display_name || groupedUsers[0].full_name,
                        user_email: groupedUsers[0].email,
                        alert_type: 'multi_account',
                        severity: 'medium',
                        related_user_ids: groupedUsers.map(u => u.id),
                        details: {
                            detection_method: 'shared_phone',
                            account_count: groupedUsers.length,
                            accounts: groupedUsers.map(u => ({
                                id: u.id,
                                name: u.display_name || u.full_name,
                                email: u.email
                            }))
                        }
                    });

                    alerts.push(alert);
                }
            }
        }

        return Response.json({ 
            success: true, 
            alerts_created: alerts.length,
            total_users_checked: users.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});