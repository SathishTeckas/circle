import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { verification_id, reference_id } = await req.json();

    const verificationId = verification_id || user.kyc_verification_id;
    const referenceId = reference_id || user.kyc_reference_id;

    if (!verificationId || !referenceId) {
      return Response.json({ 
        error: 'No KYC verification found',
        kyc_status: user.kyc_status || 'not_started'
      }, { status: 400 });
    }

    const clientId = Deno.env.get('CASHFREE_SECUREID_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_SECUREID_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Cashfree SecureID credentials not configured' }, { status: 500 });
    }

    const url = `https://api.cashfree.com/verification/form?verificationID=${encodeURIComponent(verificationId)}&referenceID=${encodeURIComponent(referenceId)}`;
    
    console.log('Checking KYC status:', { verificationId, referenceId });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret
      }
    });

    const data = await response.json();

    console.log('Cashfree status response:', { status: response.status, data });

    if (!response.ok) {
      // If not found, it means user hasn't completed verification yet
      if (response.status === 404 || data.code === 'Resource not found') {
        return Response.json({
          success: true,
          kyc_status: 'pending',
          form_status: 'PENDING',
          verified: false,
          message: 'Verification in progress'
        });
      }
      
      return Response.json({ 
        error: data.message || 'Failed to check KYC status',
        details: data
      }, { status: response.status });
    }

    // Map Cashfree status to our status
    let kycStatus = 'pending';
    const isVerified = data.form_status === 'SUCCESS';
    
    if (data.form_status === 'SUCCESS') {
      kycStatus = 'verified';
    } else if (data.form_status === 'FAILED' || data.form_status === 'REJECTED') {
      kycStatus = 'failed';
    } else if (data.form_status === 'EXPIRED') {
      kycStatus = 'expired';
    }

    // Update user's KYC status
    if (user.kyc_status !== kycStatus) {
      const updateData = { kyc_status: kycStatus };
      if (kycStatus === 'verified') {
        updateData.kyc_verified = true;
        updateData.kyc_verified_at = new Date().toISOString();
        updateData.onboarding_completed = true;
      }
      await base44.auth.updateMe(updateData);
    }

    return Response.json({
      success: true,
      kyc_status: kycStatus,
      form_status: data.form_status,
      verified: isVerified,
      verification_details: data.verification_details || [],
      name: data.name,
      phone: data.phone,
      email: data.email
    });

  } catch (error) {
    console.error('Error in checkKYCStatus:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});