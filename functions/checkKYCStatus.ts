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
    const cfSignature = Deno.env.get('CASHFREE_SIGNATURE');
    const baseUrl = 'https://sandbox.cashfree.com/verification';

    if (!clientId || !clientSecret || !cfSignature) {
      return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    // Check KYC form status using reference_id
    const response = await fetch(`${baseUrl}/form/${form_id}`, {
      method: 'GET',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-cf-signature': cfSignature,
        'x-api-version': '2024-12-01'
      }
    });

    const data = await response.json();

    console.log('Cashfree status response:', { status: response.status, data });

    if (!response.ok) {
      return Response.json({ 
        error: data.message || 'Failed to check KYC status',
        details: data
      }, { status: response.status });
    }

    // Check if verification is successful
    const isVerified = data.form_status === 'VERIFIED' || data.form_status === 'SUCCESS' || data.form_status === 'COMPLETED';
    
    if (isVerified) {
      await base44.auth.updateMe({
        kyc_verified: true,
        kyc_status: 'verified',
        onboarding_completed: true
      });
    }

    return Response.json({
      success: true,
      status: data.form_status,
      verified: isVerified,
      data: data
    });

  } catch (error) {
    console.error('Error in checkKYCStatus:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});