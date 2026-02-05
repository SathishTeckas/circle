import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, FileCheck, Camera, Clock, CheckCircle, ArrowRight, Bell, MapPin, Loader2, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const switchStyles = `
  .switch-custom[data-state="checked"] {
    background-color: rgb(139 92 246) !important;
  }
  .switch-custom[data-state="unchecked"] {
    background-color: rgb(226 232 240) !important;
  }
`;

export default function KYCVerification() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('mobile'); // mobile, otp, intro, permissions, verified
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Mobile OTP states
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Check if phone is already verified
        if (userData.phone_verified) {
          if (userData.kyc_status === 'verified' || userData.kyc_verified) {
            setStep('verified');
          } else {
            setStep('intro');
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const { data } = await base44.functions.invoke('sendMobileOTP', {
        mobile_number: mobileNumber,
        name: user?.display_name || user?.full_name || 'User'
      });

      if (data.success) {
        setVerificationId(data.verification_id);
        setStep('otp');
        setResendTimer(30);
        toast.success('OTP sent to your mobile number');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }

    setVerifyingOtp(true);
    try {
      const { data } = await base44.functions.invoke('verifyMobileOTP', {
        verification_id: verificationId,
        otp: otp
      });

      if (data.success && data.verified) {
        toast.success('Mobile number verified successfully!');
        // Update user phone number
        await base44.auth.updateMe({
          phone_number: mobileNumber,
          phone_verified: true
        });
        setStep('intro');
      } else {
        toast.error(data.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Verification failed. Please try again.');
    }
    setVerifyingOtp(false);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    await handleSendOtp();
  };

  const handleStartKYC = async () => {
    setVerifying(true);
    try {
      // Get redirect URL for after KYC completion
      const currentUrl = window.location.href;
      
      const { data } = await base44.functions.invoke('generateKYCLink', {
        phone: mobileNumber || user?.phone_number,
        name: user?.display_name || user?.full_name,
        email: user?.email,
        redirect_url: currentUrl
      });

      if (data.success && data.form_link) {
        // Open KYC form in new tab
        const kycWindow = window.open(data.form_link, '_blank');

        if (!kycWindow) {
          toast.error('Please allow popups for this site');
          setVerifying(false);
          return;
        }

        // Start polling for status
        pollKYCStatus(data.verification_id, data.reference_id, kycWindow);
      } else {
        toast.error(data.error || 'Failed to generate KYC link');
        setVerifying(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
      setVerifying(false);
    }
  };

  const pollKYCStatus = async (verId, refId, windowRef) => {
    const maxAttempts = 120;
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        toast.error('KYC verification timeout. Please try again.');
        setVerifying(false);
        if (windowRef && !windowRef.closed) {
          windowRef.close();
        }
        return;
      }

      if (windowRef && windowRef.closed) {
        // Window closed, check status one more time
        try {
          const { data } = await base44.functions.invoke('checkKYCStatus', { 
            verification_id: verId, 
            reference_id: refId 
          });
          
          if (data.verified || data.kyc_status === 'verified') {
            toast.success('KYC verification successful!');
            setVerifying(false);
            setStep('permissions');
            return;
          }
        } catch (e) {
          console.error(e);
        }
        
        toast('Verification window closed. Please try again if not completed.');
        setVerifying(false);
        return;
      }

      try {
        const { data } = await base44.functions.invoke('checkKYCStatus', { 
          verification_id: verId, 
          reference_id: refId 
        });
        
        if (data.verified || data.kyc_status === 'verified') {
          toast.success('KYC verification successful!');
          setVerifying(false);
          if (windowRef && !windowRef.closed) {
            windowRef.close();
          }
          setStep('permissions');
          return;
        }

        attempts++;
        setTimeout(checkStatus, 5000);
      } catch (error) {
        console.error('Error checking KYC status:', error);
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    };

    checkStatus();
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        onboarding_completed: true,
        location_enabled: permissions.location,
        notifications_enabled: permissions.notifications
      });
      
      const userData = await base44.auth.me();
      if (userData.user_role === 'companion') {
        window.location.href = createPageUrl('CompanionDashboard');
      } else {
        window.location.href = createPageUrl('Discover');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-12">
      <style>{switchStyles}</style>
      <div className="max-w-md mx-auto">
        
        {/* Mobile Number Step */}
        {step === 'mobile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-xl shadow-blue-500/30">
                <Phone className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                Verify Mobile Number
              </h1>
              <p className="text-slate-600">
                We'll send you an OTP to verify your mobile number
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-4 bg-slate-100 rounded-xl border border-slate-200">
                    <span className="text-slate-600 font-medium">+91</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 h-14 text-lg rounded-xl border-slate-200"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={sendingOtp || mobileNumber.length < 10}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg font-semibold rounded-2xl disabled:opacity-50"
            >
              {sendingOtp ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-500 mt-4">
              OTP will be sent via SMS and WhatsApp
            </p>
          </motion.div>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-xl shadow-blue-500/30">
                <Phone className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                Enter OTP
              </h1>
              <p className="text-slate-600">
                OTP sent to +91 {mobileNumber}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <Input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-14 text-2xl text-center tracking-[0.5em] rounded-xl border-slate-200"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otp.length < 4}
                className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg font-semibold rounded-2xl disabled:opacity-50"
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep('mobile');
                    setOtp('');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Change Number
                </button>
                <button
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || sendingOtp}
                  className={cn(
                    "text-sm font-medium",
                    resendTimer > 0 ? "text-slate-400" : "text-blue-600 hover:text-blue-700"
                  )}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Intro Step - Aadhaar KYC */}
        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-xl shadow-emerald-500/30">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                Verify Your Identity
              </h1>
              <p className="text-slate-600">
                Help us keep Circle safe by verifying your identity
              </p>
            </div>

            <div className="space-y-4 mb-10">
              {[
                { icon: FileCheck, title: 'Aadhaar Verification', desc: 'Quick and secure Aadhaar-based verification' },
                { icon: Camera, title: 'Face Verification', desc: 'Take a quick selfie for identity confirmation' },
                { icon: Clock, title: 'Quick Process', desc: 'Verification takes just a few minutes' },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100"
                >
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {verifying && (
              <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-3 text-blue-800">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <div className="text-left">
                    <p className="font-medium">Verification in progress</p>
                    <p className="text-sm">Please complete the Aadhaar verification in the popup window</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleStartKYC}
                disabled={verifying}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-lg font-semibold rounded-2xl disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Start Aadhaar Verification
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <Button
                onClick={async () => {
                  if (verifying) return;
                  setLoading(true);
                  await base44.auth.updateMe({ 
                    kyc_status: 'skipped',
                    onboarding_completed: true 
                  });
                  const userData = await base44.auth.me();
                  if (userData.user_role === 'companion') {
                    window.location.href = createPageUrl('CompanionDashboard');
                  } else {
                    window.location.href = createPageUrl('Discover');
                  }
                  setLoading(false);
                }}
                variant="outline"
                disabled={verifying || loading}
                className="w-full h-14 border-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-lg font-semibold rounded-2xl disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  'Skip for Now'
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-slate-500 mt-4">
              Your data is encrypted and handled securely
            </p>
          </motion.div>
        )}

        {/* Permissions Step */}
        {step === 'permissions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl mb-6 shadow-xl shadow-violet-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                Almost Done!
              </h1>
              <p className="text-slate-600">
                Enable these permissions for the best experience
              </p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Location</h3>
                    <p className="text-sm text-slate-600">Find companions nearby</p>
                  </div>
                </div>
                <Switch
                  checked={permissions.location}
                  onCheckedChange={(checked) => setPermissions({ ...permissions, location: checked })}
                  className="switch-custom data-[state=checked]:bg-violet-600"
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                    <p className="text-sm text-slate-600">Get booking updates</p>
                  </div>
                </div>
                <Switch
                  checked={permissions.notifications}
                  onCheckedChange={(checked) => setPermissions({ ...permissions, notifications: checked })}
                  className="switch-custom data-[state=checked]:bg-violet-600"
                />
              </div>
            </div>

            <Button
              onClick={handleCompleteSetup}
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-2xl"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Start Using Circle
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Verified Step */}
        {step === 'verified' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              You're Verified!
            </h1>
            <p className="text-slate-600 mb-8">
              Your account is now fully verified and ready to use
            </p>
            <Button
              onClick={async () => {
                await base44.auth.updateMe({ 
                  onboarding_completed: true 
                });
                if (user?.user_role === 'companion') {
                  window.location.href = createPageUrl('CompanionDashboard');
                } else {
                  window.location.href = createPageUrl('Discover');
                }
              }}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-2xl"
            >
              Continue to App
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}