import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OTPVerificationDialog({ open, onOpenChange, phone, onVerified }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open && !referenceId) {
      sendOTP();
    }
  }, [open]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    setSending(true);
    setError('');
    try {
      const { data } = await base44.functions.invoke('sendOTP', { phone });
      setReferenceId(data.verification_id);
      setCountdown(60);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send OTP');
    }
    setSending(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await base44.functions.invoke('verifyOTP', { 
        verification_id: referenceId,
        otp
      });
      
      if (data.success) {
        onVerified();
        onOpenChange(false);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            disabled={otp.length !== 6 || loading}
            className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl"
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
            {countdown > 0 ? (
              <p className="text-sm text-slate-500">
                Resend OTP in {countdown}s
              </p>
            ) : (
              <Button
                variant="ghost"
                onClick={sendOTP}
                disabled={sending}
                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend OTP'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}