import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, payload_too_large } = await req.json();

        if (payload_too_large || !data) {
            return Response.json({ success: true, message: 'Payload too large, skipping' });
        }

        // Sensitive keywords to monitor
        const KEYWORD_PATTERNS = {
            high: [
                'venmo', 'paypal', 'cash app', 'zelle', 'outside payment',
                'my number', 'whatsapp', 'telegram', 'instagram',
                'meet elsewhere', 'different location', 'skip the app'
            ],
            medium: [
                'discount', 'cheaper', 'free', 'no charge',
                'phone number', 'email', 'contact me'
            ],
            low: [
                'private', 'secret', 'dont tell'
            ]
        };

        const messageContent = data.content?.toLowerCase() || '';
        const matchedKeywords = [];
        let severity = 'low';

        // Check for keyword matches
        for (const [sev, keywords] of Object.entries(KEYWORD_PATTERNS)) {
            for (const keyword of keywords) {
                if (messageContent.includes(keyword)) {
                    matchedKeywords.push(keyword);
                    if (sev === 'high') severity = 'high';
                    else if (sev === 'medium' && severity !== 'high') severity = 'medium';
                }
            }
        }

        // If keywords found, flag the message
        if (matchedKeywords.length > 0) {
            const flaggedMessage = await base44.asServiceRole.entities.FlaggedMessage.create({
                message_id: event.entity_id,
                booking_id: data.booking_id,
                sender_id: data.sender_id,
                sender_name: data.sender_name,
                content: data.content,
                matched_keywords: matchedKeywords,
                severity: severity
            });

            // Send Slack notification for high severity
            if (severity === 'high') {
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
                            text: `⚠️ *Suspicious Chat Message Detected*\n\n*Sender:* ${data.sender_name}\n*Keywords:* ${matchedKeywords.join(', ')}\n*Severity:* HIGH\n*Message:* "${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}"`
                        })
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification:', slackError);
                }
            }

            return Response.json({ 
                success: true, 
                flagged: true,
                severity: severity,
                keywords: matchedKeywords
            });
        }

        return Response.json({ success: true, flagged: false });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});