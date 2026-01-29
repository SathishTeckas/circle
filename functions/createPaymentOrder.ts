import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CASHFREE_BASE_URL = 'https://sandbox.cashfree.com/pg';
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_CLIENT_ID');
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_CLIENT_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, amount, return_url } = await req.json();

    if (!booking_id || !amount) {
      return Response.json({ error: 'booking_id and amount are required' }, { status: 400 });
    }

    // Generate unique order ID
    const orderId = `order_${booking_id}_${Date.now()}`;

    // Create order with Cashfree
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50),
        customer_name: (user.display_name || user.full_name || 'Customer').substring(0, 100),
        customer_email: user.email,
        customer_phone: user.phone_number || '9999999999'
      },
      order_meta: {
        return_url: return_url ? return_url.replace('{order_id}', orderId) : `${req.headers.get('origin')}/PaymentCallback?booking_id=${booking_id}&order_id=${orderId}`,
        notify_url: null
      },
      order_note: `Booking payment for ${booking_id}`
    };

    console.log('Creating Cashfree order:', orderPayload);

    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2025-01-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    console.log('Cashfree response:', { status: response.status, data });

    if (!response.ok) {
      return Response.json({ 
        error: data.message || 'Failed to create payment order',
        details: data
      }, { status: response.status });
    }

    // Return payment session details
    return Response.json({
      success: true,
      order_id: data.order_id,
      cf_order_id: data.cf_order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      order_amount: data.order_amount
    });

  } catch (error) {
    console.error('Error in createPaymentOrder:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});