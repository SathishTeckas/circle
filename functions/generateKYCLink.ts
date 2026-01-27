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
    const cfSignature = Deno.env.get('CASHFREE_SIGNATURE');
    const baseUrl = 'https://sandbox.cashfree.com/verification';

    if (!clientId || !clientSecret || !cfSignature) {
      return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    const verificationId = `kyc_${user.id}_${Date.now()}`;
    
    // Generate KYC form link using the correct endpoint
    const requestBody = {
      verification_id: verificationId,
      phone: user.phone_number || '9999999999',
      template_name: 'Aadhaar_verification',
      name: user.display_name || user.full_name || 'User',
      email: user.email,
      notification_types: ['sms']
    };

    console.log('Generating KYC link with:', requestBody);

    const response = await fetch(`${baseUrl}/form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-cf-signature': cfSignature,
        'x-api-version': '2024-12-01'
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

    // Store verification_id and reference_id in user data for tracking
    await base44.auth.updateMe({
      kyc_verification_id: data.verification_id,
      kyc_reference_id: data.reference_id
    });

    return Response.json({
      success: true,
      form_url: data.form_link,
      form_id: data.reference_id,
      verification_id: data.verification_id
    });

  } catch (error) {
    console.error('Error in generateKYCLink:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});