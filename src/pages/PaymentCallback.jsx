import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentCallback() {
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const bookingId = urlParams.get('booking_id');
      const orderId = urlParams.get('order_id');

      if (!bookingId || !orderId) {
        setStatus('failed');
        setError('Missing booking or order information');
        return;
      }

      try {
        // Verify payment with Cashfree
        const { data } = await base44.functions.invoke('verifyPayment', { order_id: orderId });

        if (data.is_paid) {
          // Update booking status
          const user = await base44.auth.me();
          const bookings = await base44.entities.Booking.filter({ id: bookingId });
          const booking = bookings[0];

          if (booking) {
            await base44.entities.Booking.update(bookingId, {
              status: 'pending',
              payment_status: 'paid',
              escrow_status: 'held'
            });

            // Update availability
            if (booking.availability_id) {
              await base44.entities.Availability.update(booking.availability_id, { status: 'pending' });
            }

            // Create notification for companion
            await base44.entities.Notification.create({
              user_id: booking.companion_id,
              type: 'booking_request',
              title: '🔔 New Booking Request!',
              message: `${booking.seeker_name} wants to book you for ${booking.duration_hours}h`,
              booking_id: bookingId,
              amount: booking.base_price,
              action_url: createPageUrl(`BookingView?id=${bookingId}`)
            });
          }

          setStatus('success');
          
          // Redirect to booking view after 2 seconds
          setTimeout(() => {
            window.location.href = createPageUrl(`BookingView?id=${bookingId}`);
          }, 2000);
        } else {
          setStatus('failed');
          setError('Payment was not completed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('failed');
        setError(err.message || 'Failed to verify payment');
      }
    };

    verifyPayment();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-violet-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Verifying Payment</h2>
            <p className="text-slate-600">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-4">Your booking request has been sent to the companion.</p>
            <p className="text-sm text-slate-500">Redirecting to booking details...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Payment Failed</h2>
            <p className="text-slate-600 mb-4">{error || 'Something went wrong with your payment.'}</p>
            <Button
              onClick={() => window.history.back()}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 rounded-xl"
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}