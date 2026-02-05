import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, name, email, redirect_url } = await req.json();

    const clientId = Deno.env.get('CASHFREE_SECUREID_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_SECUREID_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Cashfree SecureID credentials not configured' }, { status: 500 });
    }

    const verificationId = `KYC_${user.id}_${Date.now()}`;
    
    // Calculate link expiry (7 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    const linkExpiry = expiryDate.toISOString().split('T')[0];

    const requestBody = {
      phone: phone || user.phone_number || user.phone,
      template_name: 'Aadhaar_verification',
      verification_id: verificationId,
      name: name || user.display_name || user.full_name || 'User',
      email: email || user.email,
      link_expiry: linkExpiry,
      notification_types: ['sms']
    };

    // Add redirect_url if provided
    if (redirect_url) {
      requestBody.redirect_url = redirect_url;
    }

    console.log('Generating KYC link with:', requestBody);

    const response = await fetch('https://api.cashfree.com/verification/form', {
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

    // Store verification_id and reference_id in user data for tracking
    await base44.auth.updateMe({
      kyc_verification_id: verificationId,
      kyc_reference_id: data.reference_id,
      kyc_status: 'pending',
      kyc_link: data.form_link
    });

    return Response.json({
      success: true,
      form_url: data.form_link,
      form_link: data.form_link,
      verification_id: verificationId,
      reference_id: data.reference_id,
      short_code: data.short_code,
      link_expiry: linkExpiry,
      form_status: data.form_status
    });

  } catch (error) {
    console.error('Error in generateKYCLink:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});