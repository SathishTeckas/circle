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
    const baseUrl = Deno.env.get('CASHFREE_VRS_BASE_URL')?.replace(/^ttps:/, 'https:') || 'https://vrs.cashfree.com';

    console.log('Cashfree URL:', `${baseUrl}/verification/otp/send`);
    console.log('Client ID:', clientId ? 'Set' : 'Not set');

    // Send OTP request to Cashfree
    const response = await fetch(`${baseUrl}/verification/otp/send`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number: `+91${phone}`,
        otp_length: 6
      })
    });

    console.log('Cashfree Response Status:', response.status);

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
      reference_id: data.reference_id 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});