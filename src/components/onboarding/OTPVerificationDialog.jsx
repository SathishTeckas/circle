import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OTPVerificationDialog({ open, onOpenChange, phone, name, onVerified }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open && phone && !verificationId) {
      sendOTP();
    }
  }, [open, phone]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    if (!phone || phone.length !== 10) {
      setError('Invalid phone number');
      return;
    }

    setSending(true);
    setError('');
    
    try {
      const response = await base44.functions.invoke('sendMobileOTP', {
        mobile_number: phone,
        name: name || 'User'
      });

      if (response.data.success) {
        setVerificationId(response.data.verification_id);
        setCountdown(30);
      } else {
        setError(response.data.error || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    }
    
    setSending(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!verificationId) {
      setError('Please request a new OTP');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await base44.functions.invoke('verifyMobileOTP', {
        verification_id: verificationId,
        otp: otp
      });

      if (response.data.success && response.data.verified) {
        onVerified();
        onOpenChange(false);
        // Reset state
        setOtp('');
        setVerificationId('');
      } else {
        setError(response.data.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    }
    
    setLoading(false);
  };

  const handleResend = () => {
    setOtp('');
    setVerificationId('');
    setError('');
    sendOTP();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setOtp('');
        setError('');
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Verify Phone Number
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Enter the 6-digit OTP sent to +91 {phone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                setError('');
              }}
              className={cn(
                "h-14 text-center text-2xl tracking-widest font-semibold rounded-xl",
                error && "border-red-500"
              )}
              maxLength={6}
              disabled={loading}
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          <Button
            onClick={verifyOTP}
            disabled={otp.length !== 6 || loading || !verificationId}
            className="w-full h-12 font-semibold rounded-xl"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify OTP
              </>
            )}
          </Button>

          <div className="text-center">
            {sending ? (
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending OTP...
              </p>
            ) : countdown > 0 ? (
              <p className="text-sm text-slate-500">
                Resend OTP in {countdown}s
              </p>
            ) : (
              <Button
                variant="ghost"
                onClick={handleResend}
                disabled={sending}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                Resend OTP
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}