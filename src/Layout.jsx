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
  X
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

  const isCompanion = user?.user_role === 'companion';
  const isAdmin = user?.user_role === 'admin';
  const isSeeker = user?.user_role === 'seeker';

  const seekerNav = [
    { name: 'Discover', icon: Search, page: 'Discover' },
    { name: 'Bookings', icon: Calendar, page: 'MyBookings' },
    { name: 'Groups', icon: Users, page: 'GroupEvents' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatList' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const companionNav = [
    { name: 'Dashboard', icon: Home, page: 'CompanionDashboard' },
    { name: 'Availability', icon: Calendar, page: 'ManageAvailability' },
    { name: 'Chat', icon: MessageCircle, page: 'ChatList' },
    { name: 'Wallet', icon: Wallet, page: 'Wallet' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  const adminNav = [
    { name: 'Dashboard', icon: Shield, page: 'AdminDashboard' },
    { name: 'Users', icon: Users, page: 'AdminUsers' },
    { name: 'Venues', icon: Home, page: 'AdminVenues' },
    { name: 'Groups', icon: Users, page: 'AdminGroups' },
    { name: 'Settings', icon: Settings, page: 'AdminSettings' },
  ];

  const navItems = isAdmin ? adminNav : isCompanion ? companionNav : seekerNav;

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: 139 92 246;
          --primary-foreground: 255 255 255;
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom, 16px);
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-bottom z-50">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
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