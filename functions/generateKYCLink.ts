import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    const baseUrl = Deno.env.get('CASHFREE_VRS_BASE_URL') || 'https://api.cashfree.com/verification';

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    // Generate KYC form link
    const requestBody = {
      verification_id: `kyc_${user.id}_${Date.now()}`,
      phone: user.phone_number
    };

    console.log('Generating KYC link with:', { verification_id: requestBody.verification_id, phone: requestBody.phone });

    const response = await fetch(`${baseUrl}/kyc-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-client-secret': clientSecret
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log('Cashfree response:', { status: response.status, data });

    if (!response.ok) {
      console.error('Cashfree error:', data);
      return Response.json({ 
        error: data.message || 'Failed to generate KYC link',
        details: data
      }, { status: response.status });
    }

    // Store verification_id in user data for tracking
    await base44.auth.updateMe({
      kyc_verification_id: data.verification_id,
      kyc_form_id: data.form_id
    });

    return Response.json({
      success: true,
      form_url: data.form_url,
      form_id: data.form_id,
      verification_id: data.verification_id
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});