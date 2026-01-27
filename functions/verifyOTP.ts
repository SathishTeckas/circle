import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, otp, reference_id } = await req.json();

    if (!phone || !otp || !reference_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    const baseUrl = Deno.env.get('CASHFREE_VRS_BASE_URL')?.replace(/^ttps:/, 'https:') || 'https://vrs.cashfree.com';

    console.log('Cashfree Verify URL:', `${baseUrl}/verification/otp/verify`);

    // Verify OTP with Cashfree
    const response = await fetch(`${baseUrl}/verification/otp/verify`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: `+91${phone}`,
        otp: otp,
        reference_id: reference_id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: data.message || 'OTP verification failed',
        details: data 
      }, { status: response.status });
    }

    // Update user as phone verified
    await base44.auth.updateMe({ 
      phone: phone,
      phone_verified: true 
    });

    return Response.json({ 
      success: true,
      message: 'Phone verified successfully',
      verified: data.verified || true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});