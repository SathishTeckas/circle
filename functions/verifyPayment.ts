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

    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Get order status from Cashfree
    const response = await fetch(`${CASHFREE_BASE_URL}/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2025-01-01'
      }
    });

    const data = await response.json();

    console.log('Cashfree order status:', { status: response.status, data });

    if (!response.ok) {
      return Response.json({ 
        error: data.message || 'Failed to verify payment',
        details: data
      }, { status: response.status });
    }

    // Check if payment is successful
    const isPaid = data.order_status === 'PAID';

    // If paid, update the booking on the server side
    if (isPaid) {
      try {
        // Find booking by payment_order_id
        const bookings = await base44.asServiceRole.entities.Booking.filter({
          payment_order_id: order_id
        });

        if (bookings.length > 0) {
          const booking = bookings[0];
          
          // Only update if not already updated (idempotent)
          if (booking.payment_status !== 'paid') {
            await base44.asServiceRole.entities.Booking.update(booking.id, {
              status: 'pending', // Waiting for companion approval
              payment_status: 'paid',
              escrow_status: 'held',
              chat_enabled: false // Enable after companion accepts
            });

            // Update availability status
            if (booking.availability_id) {
              await base44.asServiceRole.entities.Availability.update(booking.availability_id, {
                status: 'pending'
              });
            }

            // Create notification for companion
            await base44.asServiceRole.entities.Notification.create({
              user_id: booking.companion_id,
              type: 'booking_request',
              title: '🔔 New Booking Request!',
              message: `${booking.seeker_name} wants to book you for ${booking.duration_hours}h on ${booking.date}`,
              booking_id: booking.id,
              amount: booking.base_price
            });

            console.log('Booking updated successfully:', booking.id);
          }
        }
      } catch (updateError) {
        console.error('Failed to update booking:', updateError);
        // Don't fail the response - payment was still verified
      }
    }

    return Response.json({
      success: true,
      order_id: data.order_id,
      cf_order_id: data.cf_order_id,
      order_status: data.order_status,
      order_amount: data.order_amount,
      is_paid: isPaid,
      payment_details: data.payments || []
    });

  } catch (error) {
    console.error('Error in verifyPayment:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});