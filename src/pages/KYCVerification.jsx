import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Shield, FileCheck, Camera, Clock, CheckCircle, ArrowRight, Bell, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Custom styled switch override
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
  const [step, setStep] = useState('intro'); // intro, permissions, pending, verified
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [kycFormId, setKycFormId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Removed auto-redirect on onboarding_completed to allow KYC flow
        
        if (userData.kyc_status === 'verified' || userData.kyc_verified) {
          setStep('verified');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const handleStartKYC = async () => {
    setVerifying(true);
    try {
      console.log('Starting KYC verification...');
      const response = await base44.functions.invoke('generateKYCLink', {});
      console.log('KYC Link Response:', response.data);
      
      if (response.data.success && response.data.form_url) {
        setKycFormId(response.data.form_id);
        
        console.log('Opening KYC form:', response.data.form_url);
        
        // Open KYC form in new window
        const width = 500;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const kycWindow = window.open(
          response.data.form_url,
          'KYC Verification',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        
        if (!kycWindow) {
          toast.error('Please allow popups for this site');
          setVerifying(false);
          return;
        }
        
        // Start polling for status
        pollKYCStatus(response.data.form_id, kycWindow);
      } else {
        console.error('Invalid response from generateKYCLink:', response.data);
        toast.error(response.data.error || 'Failed to generate KYC link');
        setVerifying(false);
      }
    } catch (error) {
      console.error('Error generating KYC link:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to start KYC verification';
      toast.error(errorMsg);
      setVerifying(false);
    }
  };

  const pollKYCStatus = async (formId, windowRef) => {
    const maxAttempts = 120; // Poll for 10 minutes max (every 5 seconds)
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

      // Check if window is closed
      if (windowRef && windowRef.closed) {
        toast('Verification window closed. Please try again if not completed.');
        setVerifying(false);
        return;
      }

      try {
        const { data } = await base44.functions.invoke('checkKYCStatus', { form_id: formId, verification_id: formId });
        
        if (data.verified) {
          toast.success('KYC verification successful!');
          setVerifying(false);
          if (windowRef && !windowRef.closed) {
            windowRef.close();
          }
          
          // Move to permissions step
          setStep('permissions');
          return;
        }

        attempts++;
        setTimeout(checkStatus, 5000); // Check every 5 seconds
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
        kyc_status: 'verified', // Simulating verification
        kyc_verified: true,
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
                Help us keep Circle safe by verifying your identity
              </p>
            </div>

            <div className="space-y-4 mb-10">
              {[
                { icon: FileCheck, title: 'Government ID', desc: 'Upload a valid government-issued ID' },
                { icon: Camera, title: 'Selfie Verification', desc: 'Take a quick selfie for face matching' },
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
                // Make sure onboarding_completed is set to true
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