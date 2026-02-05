import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mobile_number, name } = await req.json();

        if (!mobile_number) {
            return Response.json({ error: 'Mobile number is required' }, { status: 400 });
        }

        const clientId = Deno.env.get("CASHFREE_SECUREID_CLIENT_ID");
        const clientSecret = Deno.env.get("CASHFREE_SECUREID_CLIENT_SECRET");

        if (!clientId || !clientSecret) {
            return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
        }

        // Generate unique verification ID
        const verificationId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const response = await fetch('https://api.cashfree.com/verification/mobile360/otp/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-version': '2024-12-01',
                'x-client-id': clientId,
                'x-client-secret': clientSecret
            },
            body: JSON.stringify({
                verification_id: verificationId,
                mobile_number: mobile_number,
                name: name || user.full_name || 'User',
                user_consent: {
                    timestamp: timestamp,
                    purpose: 'User consent to verify mobile number.',
                    obtained: true,
                    type: 'EXPLICIT'
                },
                notification_modes: ['SMS', 'WHATSAPP']
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return Response.json({ 
                error: data.message || 'Failed to send OTP',
                details: data 
            }, { status: response.status });
        }

        return Response.json({
            success: true,
            verification_id: verificationId,
            message: 'OTP sent successfully',
            data: data
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});