import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Bell, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

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
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

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
      </div>
    </div>
  );
}