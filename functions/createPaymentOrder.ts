import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Cashfree API configuration
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_CLIENT_ID');
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_CLIENT_SECRET');

// Use sandbox for testing, production for live
const CASHFREE_ORDERS_URL = 'https://sandbox.cashfree.com/pg';
const CASHFREE_LINKS_URL = 'https://sandbox.cashfree.com/links';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, amount, return_url, use_payment_link } = await req.json();

    if (!booking_id || !amount) {
      return Response.json({ error: 'booking_id and amount are required' }, { status: 400 });
    }

    // Generate unique order/link ID
    const orderId = `order_${booking_id}_${Date.now()}`;
    const origin = req.headers.get('origin') || 'https://circle-eb51a399.base44.app';
    const callbackUrl = return_url || `${origin}/PaymentCallback?booking_id=${booking_id}&order_id=${orderId}`;

    console.log('Cashfree credentials:', { 
      hasAppId: !!CASHFREE_APP_ID, 
      hasSecret: !!CASHFREE_SECRET_KEY,
      usePaymentLink: use_payment_link
    });

    // Use Payment Links API for mobile compatibility (works in any browser)
    if (use_payment_link) {
      const linkPayload = {
        link_id: orderId,
        link_amount: amount,
        link_currency: 'INR',
        link_purpose: `Booking payment for ${booking_id}`,
        customer_details: {
          customer_name: (user.display_name || user.full_name || 'Customer').substring(0, 100),
          customer_email: user.email,
          customer_phone: user.phone_number || '9999999999'
        },
        link_meta: {
          return_url: callbackUrl,
          notify_url: null
        },
        link_notify: {
          send_sms: false,
          send_email: false
        },
        link_auto_reminders: false,
        link_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
      };

      console.log('Creating Cashfree payment link:', linkPayload);

      const response = await fetch(`${CASHFREE_LINKS_URL}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01'
        },
        body: JSON.stringify(linkPayload)
      });

      const data = await response.json();
      console.log('Cashfree payment link response:', { status: response.status, data });

      if (!response.ok) {
        return Response.json({ 
          error: data.message || 'Failed to create payment link',
          details: data
        }, { status: response.status });
      }

      // Return payment link URL - this works in any browser!
      return Response.json({
        success: true,
        order_id: orderId,
        link_id: data.link_id,
        link_url: data.link_url, // This is the hosted checkout URL
        link_status: data.link_status,
        order_amount: amount
      });
    }

    // Standard Orders API (for web with JS SDK)
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
        return_url: callbackUrl,
        notify_url: null
      },
      order_note: `Booking payment for ${booking_id}`
    };

    console.log('Creating Cashfree order:', orderPayload);

    const response = await fetch(`${CASHFREE_ORDERS_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
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
      payment_link: data.payment_link,
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