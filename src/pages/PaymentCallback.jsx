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
        // Verify payment with Cashfree - this also updates booking on server side
        const { data } = await base44.functions.invoke('verifyPayment', { order_id: orderId });

        if (data.is_paid) {
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 4px 16px rgba(45, 52, 54, 0.12)' }}>
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: '#FFD93D' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: '#2D3436' }}>Verifying Payment</h2>
            <p style={{ color: '#636E72' }}>Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#4ECDC4' }}>
              <CheckCircle className="w-10 h-10" style={{ color: '#FFFFFF' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#2D3436' }}>Payment Successful!</h2>
            <p className="mb-4" style={{ color: '#636E72' }}>Your booking request has been sent to the companion.</p>
            <p className="text-sm mb-4" style={{ color: '#B2BEC3' }}>Redirecting to booking details...</p>
            <Button
              onClick={() => window.location.href = createPageUrl('Discover')}
              variant="outline"
              className="w-full h-12 rounded-xl font-bold"
              style={{ borderColor: '#DFE6E9', color: '#2D3436' }}
            >
              Go to Home
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FF6B6B' }}>
              <XCircle className="w-10 h-10" style={{ color: '#FFFFFF' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#2D3436' }}>Payment Failed</h2>
            <p className="mb-4" style={{ color: '#636E72' }}>{error || 'Something went wrong with your payment.'}</p>
            <Button
              onClick={() => window.history.back()}
              className="w-full h-12 rounded-xl font-bold"
              style={{ background: '#FFD93D', color: '#2D3436' }}
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}