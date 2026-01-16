import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
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

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  // Pages that don't need navigation
  const noNavPages = ['Welcome', 'Onboarding', 'RoleSelection', 'TermsAcceptance', 'KYCVerification'];
  const hideNav = noNavPages.includes(currentPageName);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to onboarding if not completed
  if (user && !user.onboarding_completed && !noNavPages.includes(currentPageName)) {
    window.location.href = createPageUrl('Welcome');
    return null;
  }

  const activeRole = user?.active_role || user?.user_role;
  const isCompanion = activeRole === 'companion';
  const isAdmin = user?.user_role === 'admin';
  const isSeeker = activeRole === 'seeker';

  const seekerNav = [
    { name: 'Discover', icon: Search, page: 'Discover' },
    { name: 'Bookings', icon: Calendar, page: 'CalendarView' },
    { name: 'Groups', icon: Users, page: 'GroupEvents' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatList' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const companionNav = [
    { name: 'Dashboard', icon: Home, page: 'CompanionDashboard' },
    { name: 'Bookings', icon: Calendar, page: 'CalendarView' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatList' },
    { name: 'Wallet', icon: Wallet, page: 'Wallet' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const adminNav = [
    { name: 'Dashboard', icon: Shield, page: 'AdminDashboard' },
    { name: 'Users', icon: Users, page: 'AdminUsers' },
    { name: 'Venues', icon: Home, page: 'AdminVenues' },
    { name: 'Cities', icon: MapPin, page: 'AdminCities' },
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
      <div className="min-h-screen bg-slate-50">
        <style>{`
          :root {
            --primary: 139 92 246;
            --primary-foreground: 255 255 255;
          }
        `}</style>
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-slate-200 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Circle Admin
              </h1>
              {/* Remove back button - not needed in admin panel */}
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              {adminNav.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive 
                        ? "bg-violet-50 text-violet-600" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.display_name || user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto overflow-x-auto">
            {adminNav.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full transition-all",
                    isActive 
                      ? "text-violet-600" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 mb-1 transition-transform",
                    isActive && "scale-110"
                  )} />
                  <span className="text-[10px] font-medium">{item.name}</span>
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
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: 139 92 246;
          --primary-foreground: 255 255 255;
        }
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}>
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full transition-all",
                    isActive 
                      ? "text-violet-600" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 mb-1 transition-transform",
                    isActive && "scale-110"
                  )} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                  {isActive && (
                    <div className="absolute top-0 w-12 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}