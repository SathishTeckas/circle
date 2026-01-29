import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CASHFREE_BASE_URL = 'https://sandbox.cashfree.com/pg';
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_CLIENT_ID');
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_CLIENT_SECRET');

Deno.serve(async (req) => {
  try {
    console.log('=== processRefund function called ===');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    console.log('User authenticated:', user?.email);

    if (!user) {
      console.log('ERROR: Unauthorized - no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { order_id, refund_amount, refund_reason, booking_id } = body;
    
    console.log('Refund request received:', { order_id, refund_amount, refund_reason, booking_id });

    if (!order_id || !refund_amount) {
      console.log('ERROR: Missing required fields');
      return Response.json({ error: 'order_id and refund_amount are required' }, { status: 400 });
    }

    // Generate unique refund ID
    const refundId = `refund_${booking_id || 'manual'}_${Date.now()}`;

    // Process refund with Cashfree
    const refundPayload = {
      refund_amount: refund_amount,
      refund_id: refundId,
      refund_note: refund_reason || 'Booking cancelled/rejected',
      refund_speed: 'STANDARD'
    };

    console.log('Cashfree API credentials check:', {
      hasAppId: !!CASHFREE_APP_ID,
      hasSecretKey: !!CASHFREE_SECRET_KEY,
      appIdLength: CASHFREE_APP_ID?.length,
      secretKeyLength: CASHFREE_SECRET_KEY?.length
    });
    
    console.log('Calling Cashfree refund API:', {
      url: `${CASHFREE_BASE_URL}/orders/${order_id}/refunds`,
      payload: refundPayload
    });

    const response = await fetch(`${CASHFREE_BASE_URL}/orders/${order_id}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2025-01-01'
      },
      body: JSON.stringify(refundPayload)
    });

    const data = await response.json();

    console.log('Cashfree refund API response:', { 
      httpStatus: response.status, 
      responseData: JSON.stringify(data) 
    });

    if (!response.ok) {
      console.log('ERROR: Cashfree refund failed:', data);
      return Response.json({ 
        error: data.message || 'Failed to process refund',
        details: data
      }, { status: response.status });
    }

    console.log('SUCCESS: Refund processed successfully:', {
      refund_id: data.refund_id,
      cf_refund_id: data.cf_refund_id,
      refund_status: data.refund_status
    });

    return Response.json({
      success: true,
      refund_id: data.refund_id,
      cf_refund_id: data.cf_refund_id,
      refund_status: data.refund_status,
      refund_amount: data.refund_amount
    });

  } catch (error) {
    console.error('EXCEPTION in processRefund:', error.message, error.stack);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});