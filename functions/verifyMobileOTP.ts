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
            return Response.json({ error: 'Verification ID and OTP are required' }, { status: 400 });
        }

        const clientId = Deno.env.get("CASHFREE_SECUREID_CLIENT_ID");
        const clientSecret = Deno.env.get("CASHFREE_SECUREID_CLIENT_SECRET");

        if (!clientId || !clientSecret) {
            return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
        }

        const response = await fetch('https://api.cashfree.com/verification/mobile360/otp/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-version': '2024-12-01',
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
                error: data.message || 'OTP verification failed',
                details: data 
            }, { status: response.status });
        }

        // Update user's phone verification status if successful
        // Cashfree returns status: "SUCCESS" when OTP is verified
        const isVerified = data.status === 'SUCCESS' || data.status === 'VALID' || data.verified === true;
        
        if (isVerified) {
            await base44.auth.updateMe({
                phone_verified: true,
                phone_verified_at: new Date().toISOString()
            });
        }

        return Response.json({
            success: true,
            verified: isVerified,
            message: isVerified ? 'Mobile number verified successfully' : 'OTP verification failed',
            data: data
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});