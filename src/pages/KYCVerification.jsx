import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, FileCheck, Camera, Clock, CheckCircle, ArrowRight, Bell, MapPin, Loader2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
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
  const [step, setStep] = useState('intro'); // intro, otp, permissions, verified
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false
  });
  const [loading, setLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.kyc_status === 'verified' || userData.kyc_verified) {
          setStep('verified');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const handleSendOTP = () => {
    if (aadhaarNumber.length === 12) {
      setShowOTP(true);
      toast.success('OTP sent to your registered mobile number');
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length === 6) {
      setVerifying(true);
      // Simulate verification delay
      setTimeout(async () => {
        await base44.auth.updateMe({
          kyc_status: 'verified',
          kyc_verified: true
        });
        toast.success('Aadhaar verification successful!');
        setVerifying(false);
        setStep('permissions');
      }, 1500);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    await base44.auth.updateMe({ 
      kyc_status: 'skipped',
      kyc_verified: true,
      onboarding_completed: true 
    });
    const userData = await base44.auth.me();
    if (userData.user_role === 'companion') {
      window.location.href = createPageUrl('CompanionDashboard');
    } else {
      window.location.href = createPageUrl('Discover');
    }
    setLoading(false);
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
        
        {/* Intro Step */}
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
                Help us keep BeThere safe by verifying your identity
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {[
                { icon: FileCheck, title: 'Aadhaar Verification', desc: 'Enter your 12-digit Aadhaar number' },
                { icon: Camera, title: 'OTP Verification', desc: 'Verify with OTP sent to registered mobile' },
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

            {/* Aadhaar Input */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Aadhaar Number</label>
                <Input
                  type="text"
                  placeholder="Enter 12-digit Aadhaar number"
                  value={aadhaarNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setAadhaarNumber(value);
                    if (showOTP) {
                      setShowOTP(false);
                      setOtp('');
                    }
                  }}
                  className="h-14 rounded-xl text-center text-lg tracking-widest"
                  maxLength={12}
                />
              </div>

              {aadhaarNumber.length === 12 && !showOTP && (
                <Button
                  onClick={handleSendOTP}
                  className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-lg font-semibold rounded-2xl"
                >
                  Send OTP
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}

              {showOTP && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Enter OTP</label>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(value);
                      }}
                      className="h-14 rounded-xl text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      OTP sent to Aadhaar registered mobile • <button type="button" onClick={handleSendOTP} className="text-emerald-600 font-medium">Resend</button>
                    </p>
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={otp.length !== 6 || verifying}
                    className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-lg font-semibold rounded-2xl disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Aadhaar
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>

            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={loading}
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
                  Start Using BeThere
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
                await base44.auth.updateMe({ onboarding_completed: true });
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