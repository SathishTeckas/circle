import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { error_message, error_stack, page, action, severity = 'medium', browser_info } = await req.json();

        // Get user info if authenticated
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (e) {
            // User not authenticated, continue without user info
        }

        // Create error log entry
        const errorLog = await base44.asServiceRole.entities.ErrorLog.create({
            user_id: user?.id,
            user_email: user?.email,
            user_name: user?.full_name || user?.display_name,
            error_message,
            error_stack,
            page,
            action,
            severity,
            browser_info: browser_info || req.headers.get('user-agent')
        });

        // Send Slack notification for high/critical errors
        if (severity === 'high' || severity === 'critical') {
            try {
                const slackToken = await base44.asServiceRole.connectors.getAccessToken('slack');
                
                const slackMessage = {
                    channel: '#errors', // Change to your channel
                    text: `🚨 ${severity.toUpperCase()} Error Detected`,
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: `🚨 ${severity.toUpperCase()} Error`,
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: `*Page:*\n${page || 'Unknown'}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Action:*\n${action || 'Unknown'}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*User:*\n${user?.email || 'Anonymous'}`
                                },
                                {
                                    type: 'mrkdwn',
                                    text: `*Time:*\n${new Date().toLocaleString()}`
                                }
                            ]
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*Error:*\n\`\`\`${error_message}\`\`\``
                            }
                        }
                    ]
                };

                await fetch('https://slack.com/api/chat.postMessage', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${slackToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(slackMessage)
                });
            } catch (slackError) {
                console.error('Failed to send Slack notification:', slackError);
            }
        }

        return Response.json({ 
            success: true, 
            error_id: errorLog.id 
        });

    } catch (error) {
        console.error('Error in logError function:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});