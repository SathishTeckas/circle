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

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');

    // Verify OTP with Cashfree Mobile360 API
    const response = await fetch('https://api.cashfree.com/verification/mobile360/otp/verify', {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2024-12-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        verification_id: verification_id,
        otp: otp
      })
    });

    const data = await response.json();

    if (!response.ok || data.status !== 'SUCCESS') {
      return Response.json({ 
        error: data.message || 'Invalid OTP',
        details: data 
      }, { status: response.status });
    }

    // Update user as phone verified
    const phoneNumber = data.mobile_number;
    await base44.auth.updateMe({ 
      phone: phoneNumber,
      phone_verified: true 
    });

    return Response.json({ 
      success: true,
      message: 'Phone verified successfully',
      data: data
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});