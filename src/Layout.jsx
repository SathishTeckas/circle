import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  Search, 
  Calendar, 
  MessageCircle, 
  User, 
  Users,
  Wallet,
  Settings,
  Shield,
  Menu,
  X,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import GlobalErrorBoundary from '@/components/utils/GlobalErrorBoundary';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Layout({ children, currentPageName }) {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const { data: user = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000
  });

  useEffect(() => {
    if (user !== undefined) {
      setLoading(false);
    }
  }, [user]);

  // Pages that don't need navigation
  const noNavPages = ['Welcome', 'Onboarding', 'RoleSelection', 'TermsAcceptance', 'KYCVerification'];
  const hideNav = noNavPages.includes(currentPageName);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Redirect to appropriate onboarding page if not completed
  if (user && !noNavPages.includes(currentPageName)) {
    if (!user.user_role) {
      window.location.href = createPageUrl('RoleSelection');
      return null;
    } else if (!user.terms_accepted) {
      window.location.href = createPageUrl('TermsAcceptance');
      return null;
    } else if (!user.onboarding_completed) {
      // If they haven't completed onboarding, send to appropriate page
      if (user.display_name && user.profile_photos?.length > 0) {
        window.location.href = createPageUrl('KYCVerification');
      } else {
        window.location.href = createPageUrl('Onboarding');
      }
      return null;
    }
    // Note: We removed the kyc_verified check here because onboarding_completed
    // should be set to true ONLY after KYC is done (verified or skipped)
  }

  const activeRole = user?.active_role || user?.user_role;
  const isCompanion = activeRole === 'companion';
  const isAdmin = user?.user_role === 'admin';
  const isSeeker = activeRole === 'seeker';

  const seekerNav = [
    { name: 'Discover', icon: Search, page: 'Discover' },
    { name: 'Meetups', icon: Calendar, page: 'CalendarView' },
    { name: 'Groups', icon: Users, page: 'GroupEvents' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatList' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const companionNav = [
    { name: 'Dashboard', icon: Home, page: 'CompanionDashboard' },
    { name: 'Meetups', icon: Calendar, page: 'CalendarView' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatList' },
    { name: 'Wallet', icon: Wallet, page: 'Wallet' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const adminNav = [
    { name: 'Dashboard', icon: Shield, page: 'AdminDashboard' },
    { name: 'Users', icon: Users, page: 'AdminUsers' },
    { name: 'Venues', icon: Home, page: 'AdminVenues' },
    { name: 'Cities', icon: MapPin, page: 'AdminCities' },
    { name: 'Campaigns', icon: Users, page: 'AdminCampaignReferrals' },
    { name: 'Analytics', icon: Shield, page: 'EventAnalytics' },
    { name: 'Errors', icon: AlertCircle, page: 'AdminErrors' },
    { name: 'Payouts', icon: Wallet, page: 'AdminPayouts' },
    { name: 'Disputes', icon: AlertCircle, page: 'AdminDisputes' },
    { name: 'Reviews', icon: AlertCircle, page: 'AdminFlaggedReviews' },
    { name: 'Admins', icon: Shield, page: 'AdminManagement' },
    { name: 'Settings', icon: Settings, page: 'AdminSettings' },
  ];

  const navItems = isAdmin ? adminNav : isCompanion ? companionNav : seekerNav;

  // Admin web layout
  if (isAdmin && !hideNav) {
    return (
      <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto" style={{ borderColor: '#DFE6E9' }}>
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b" style={{ borderColor: '#DFE6E9' }}>
              <h1 className="text-xl font-extrabold" style={{ color: '#2D3436' }}>
                Circle Admin
              </h1>
              <NotificationCenter />
            </div>
            
            {/* Header with notifications */}
            <div className="flex items-center justify-end px-4 py-4 border-b border-slate-100">
              <NotificationCenter />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              {adminNav.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: isActive ? '#FFF3B8' : 'transparent',
                      color: isActive ? '#2D3436' : '#636E72'
                    }}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t" style={{ borderColor: '#DFE6E9' }}>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#FFD93D' }}>
                  <Shield className="w-4 h-4" style={{ color: '#2D3436' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#2D3436' }}>{user?.display_name || user?.full_name || 'Admin'}</p>
                  <p className="text-xs" style={{ color: '#636E72' }}>Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50" style={{ borderColor: '#DFE6E9' }}>
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto overflow-x-auto">
            {adminNav.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className="flex flex-col items-center justify-center w-full h-full transition-all"
                  style={{ color: isActive ? '#2D3436' : '#B2BEC3' }}
                >
                  <item.icon className="w-5 h-5 mb-1" style={isActive ? { transform: 'scale(1.1)' } : {}} />
                  <span className="text-[10px] font-bold">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className={cn(
          "min-h-screen md:pl-64",
          "pb-20 md:pb-0"
        )}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <GlobalErrorBoundary>
      <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <style>{`
          .safe-bottom {
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          }
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .pb-20 {
              padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px)) !important;
            }
          }
        `}</style>
        
        {/* Main Content */}
        <main className={cn(
          "min-h-screen",
          !hideNav && "pb-20"
        )}>
          {children}
        </main>

        {/* Bottom Navigation */}
        {!hideNav && user && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50" style={{ borderColor: '#DFE6E9', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}>
              {navItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className="flex flex-col items-center justify-center w-full h-full transition-all relative"
                    style={{ color: isActive ? '#2D3436' : '#B2BEC3' }}
                  >
                    <item.icon className="w-5 h-5 mb-1" style={isActive ? { transform: 'scale(1.1)' } : {}} />
                    <span className="text-[10px] font-bold">{item.name}</span>
                    {isActive && (
                      <div className="absolute top-0 w-12 h-0.5 rounded-full" style={{ background: '#FFD93D' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </GlobalErrorBoundary>
  );
}