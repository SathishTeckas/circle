import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await req.json();

    if (!phone || phone.length !== 10) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');

    // Generate unique verification ID for this request
    const verificationId = `ver_${user.id}_${Date.now()}`;

    // Send OTP request to Cashfree Mobile360 API
    const response = await fetch('https://api.cashfree.com/verification/mobile360/otp/send', {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2024-12-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        verification_id: verificationId,
        mobile_number: phone,
        name: user.display_name || user.full_name || 'User',
        user_consent: {
          timestamp: new Date().toISOString(),
          purpose: 'Phone number verification for account registration',
          obtained: true,
          type: 'EXPLICIT'
        },
        notification_modes: ['SMS']
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
      message: 'OTP sent successfully',
      verification_id: data.verification_id,
      reference_id: data.reference_id 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});