import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Capture campaign code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignCode = urlParams.get('campaign');
    if (campaignCode) {
      // Save campaign code to user profile
      base44.auth.updateMe({ campaign_referral_code: campaignCode }).catch(console.error);
    }
  }, []);

  const roles = [
    {
      id: 'seeker',
      title: 'Find Companionship',
      subtitle: 'I want to meet people',
      description: 'Discover verified companions for meaningful conversations and experiences at public venues',
      icon: Search,
      features: ['Browse companions', 'Book meetups', 'Join group events'],
      iconBg: '#74B9FF',
      selectedBg: '#FFF3B8'
    },
    {
      id: 'companion',
      title: 'Offer Companionship',
      subtitle: 'I want to be a companion',
      description: 'Share your time and create meaningful connections while earning on your own schedule',
      icon: Sparkles,
      features: ['Set your rates', 'Manage availability', 'Build reputation'],
      iconBg: '#A8A4FF',
      selectedBg: '#FFF3B8'
    }
  ];

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await base44.auth.updateMe({ user_role: selectedRole });
      window.location.href = createPageUrl('TermsAcceptance');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen px-6 py-12" style={{ background: 'linear-gradient(to bottom, #F8F9FA, #FFFFFF)', fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-extrabold mb-3" style={{ color: '#2D3436' }}>
            How would you like to use BeThere?
          </h1>
          <p style={{ color: '#636E72' }}>
            Choose your primary role. You can always switch later.
          </p>
        </motion.div>

        <div className="space-y-4 mb-8">
          {roles.map((role, idx) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedRole(role.id)}
              className="w-full text-left p-6 rounded-3xl border-2 transition-all duration-300"
              style={{
                borderColor: selectedRole === role.id ? '#FFD93D' : '#DFE6E9',
                background: selectedRole === role.id ? '#FFF3B8' : '#FFFFFF',
                boxShadow: selectedRole === role.id ? '0 4px 16px rgba(45, 52, 54, 0.12)' : 'none'
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: selectedRole === role.id ? '#FFD93D' : role.iconBg }}
                >
                  <role.icon className="w-7 h-7" style={{ color: selectedRole === role.id ? '#2D3436' : '#FFFFFF' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold" style={{ color: '#2D3436' }}>
                      {role.title}
                    </h3>
                    <div 
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: selectedRole === role.id ? '#FFD93D' : '#DFE6E9',
                        background: selectedRole === role.id ? '#FFD93D' : 'transparent'
                      }}
                    >
                      {selectedRole === role.id && (
                        <Check className="w-4 h-4" style={{ color: '#2D3436' }} />
                      )}
                    </div>
                  </div>
                  <p className="text-sm mb-3" style={{ color: '#636E72' }}>{role.subtitle}</p>
                  <p className="text-sm" style={{ color: '#636E72' }}>{role.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className="w-full h-14 text-lg font-bold rounded-2xl disabled:opacity-50 transition-all hover:transform hover:-translate-y-0.5"
          style={{ 
            background: '#FFD93D', 
            color: '#2D3436',
            boxShadow: '0 4px 16px rgba(45, 52, 54, 0.12)'
          }}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2D3436', borderTopColor: 'transparent' }} />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}