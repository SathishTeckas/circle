import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function Welcome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

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

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80"
          alt="People together"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      {/* Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{currentTime}</span>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12">
        {/* Headline */}
        <div className="mb-12">
          <h1 className="text-5xl sm:text-6xl font-serif font-bold text-white leading-tight text-center mb-4">
            Your weekly dose of togetherness.
          </h1>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('RoleSelection'))}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white text-base font-medium rounded-full shadow-lg transition-all"
          >
            Get started
          </Button>
          
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            variant="outline"
            className="w-full h-14 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-white/30 text-base font-medium rounded-full transition-all"
          >
            I already have an account
          </Button>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-white/70 mt-6 px-4">
          By signing up you agree to the{' '}
          <span className="underline">Terms of Service</span>,{' '}
          <span className="underline">Privacy Policy</span> and{' '}
          <span className="underline">Community Guidelines</span>.
        </p>

        {/* Home Indicator */}
        <div className="flex justify-center mt-4">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}