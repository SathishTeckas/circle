import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Heart, Users, Shield, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Welcome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await base44.auth.isAuthenticated();
        setIsAuthenticated(auth);
        if (auth) {
          const user = await base44.auth.me();
          if (user.onboarding_completed) {
            if (user.user_role === 'companion') {
              window.location.href = createPageUrl('CompanionDashboard');
            } else if (user.user_role === 'admin') {
              window.location.href = createPageUrl('AdminDashboard');
            } else {
              window.location.href = createPageUrl('Discover');
            }
          } else if (user.user_role) {
            window.location.href = createPageUrl('Onboarding');
          } else {
            window.location.href = createPageUrl('RoleSelection');
          }
        }
      } catch (e) {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const features = [
    { icon: Shield, title: 'Verified Profiles', desc: 'Every companion is KYC verified for your safety' },
    { icon: MapPin, title: 'Public Venues Only', desc: 'All meetups happen in safe, public places' },
    { icon: Users, title: 'Real Connection', desc: 'Genuine conversations with real people' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-violet-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-fuchsia-400/20 rounded-full blur-3xl" />
        
        <div className="relative px-6 pt-16 pb-12 max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl mb-6 shadow-xl shadow-violet-500/30">
              <Heart className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              Circle
            </h1>
            <p className="text-lg text-slate-600 mb-2">
              Real conversations. Real people. Real places.
            </p>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Find verified companions for meaningful, safe, in-person connections
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-8 max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-4"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
              className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="px-6 pb-12 max-w-md mx-auto space-y-3"
      >
        <Button 
          onClick={() => base44.auth.redirectToLogin(createPageUrl('RoleSelection'))}
          className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-violet-500/30"
        >
          Get Started
        </Button>
        <p className="text-center text-xs text-slate-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}