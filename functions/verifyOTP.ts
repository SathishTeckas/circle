import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { verification_id, otp } = await req.json();

        if (!verification_id || !otp) {
            return Response.json({ error: 'Missing verification_id or otp' }, { status: 400 });
        }

        const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
        const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
        const baseUrl = Deno.env.get('CASHFREE_VRS_BASE_URL');

        const response = await fetch(`${baseUrl}/v2/verification/otp/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': clientId,
                'x-client-secret': clientSecret
            },
            body: JSON.stringify({
                verification_id: verification_id,
                otp: otp
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return Response.json({ 
                error: data.message || 'Invalid OTP',
                details: data 
            }, { status: response.status });
        }

        // Update user's phone verification status
        await base44.auth.updateMe({ phone_verified: true });

        return Response.json({ 
            success: true,
            verified: data.verified || true,
            message: 'Phone number verified successfully'
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});