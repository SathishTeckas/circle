import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import SignInModal from '@/components/auth/SignInModal';
import { motion } from 'framer-motion';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export default function Welcome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [showLanguages, setShowLanguages] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    // Capture referral code from URL and store in localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }

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
        if (auth) {
          const user = await base44.auth.me();
          // Only redirect if user has completed onboarding
          if (user.onboarding_completed) {
            if (user.user_role === 'companion') {
              window.location.href = createPageUrl('CompanionDashboard');
            } else if (user.user_role === 'admin') {
              window.location.href = createPageUrl('AdminDashboard');
            } else {
              window.location.href = createPageUrl('Discover');
            }
            return;
          } else {
            // User is authenticated but hasn't completed onboarding
            window.location.href = createPageUrl('RoleSelection');
            return;
          }
        }
      } catch (e) {
        // Not authenticated, show welcome page
      }
      setLoading(false);
    };
    checkAuth();

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#FFFFFF', fontFamily: "'Nunito', sans-serif" }}>
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
        <button 
          onClick={() => setShowLanguages(true)}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
        >
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
            onClick={() => window.location.href = createPageUrl('RoleSelection')}
            className="w-full h-14 text-base font-bold rounded-full shadow-lg transition-all hover:transform hover:-translate-y-0.5"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            Get started
          </Button>
          
          <Button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Profile'))}
            variant="outline"
            className="w-full h-14 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-white/30 text-base font-bold rounded-full transition-all"
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

      {/* Language Selector Sheet */}
      <Sheet open={showLanguages} onOpenChange={setShowLanguages}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl" style={{ borderRadius: '24px 24px 0 0' }}>
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl font-bold" style={{ color: '#2D3436' }}>Select Language</SheetTitle>
          </SheetHeader>
          
          <div className="overflow-y-auto space-y-2 pb-6" style={{ maxHeight: 'calc(70vh - 100px)' }}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setSelectedLanguage(lang.code);
                  setShowLanguages(false);
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl transition-colors"
                style={{ 
                  background: selectedLanguage === lang.code ? '#FFF3B8' : 'transparent',
                  border: selectedLanguage === lang.code ? '2px solid #FFD93D' : '2px solid transparent'
                }}
              >
                <div className="text-left">
                  <p className="font-bold" style={{ color: '#2D3436' }}>{lang.name}</p>
                  <p className="text-sm" style={{ color: '#636E72' }}>{lang.nativeName}</p>
                </div>
                {selectedLanguage === lang.code && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#FFD93D' }}>
                    <Check className="w-4 h-4" style={{ color: '#2D3436' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sign In Modal */}
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  );
}