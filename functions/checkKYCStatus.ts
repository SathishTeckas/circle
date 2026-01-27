import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { form_id } = await req.json();

    if (!form_id) {
      return Response.json({ error: 'form_id is required' }, { status: 400 });
    }

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    let baseUrl = (Deno.env.get('CASHFREE_VRS_BASE_URL') || 'https://api.cashfree.com/verification').trim();
    if (baseUrl.startsWith('ttps://')) baseUrl = 'h' + baseUrl;
    if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    // Check KYC form status
    const response = await fetch(`${baseUrl}/kyc-links/${form_id}`, {
      method: 'GET',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: data.message || 'Failed to check KYC status',
        details: data
      }, { status: response.status });
    }

    // If verification is successful, update user
    if (data.status === 'VERIFIED' || data.status === 'SUCCESS') {
      await base44.auth.updateMe({
        kyc_verified: true,
        verification_status: 'verified',
        onboarding_completed: true
      });
    }

    return Response.json({
      success: true,
      status: data.status,
      verified: data.status === 'VERIFIED' || data.status === 'SUCCESS',
      data: data
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});