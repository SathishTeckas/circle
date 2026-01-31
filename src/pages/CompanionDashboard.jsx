import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { formatTime12Hour } from '../components/utils/timeFormat';
import { formatCurrency } from '../components/utils/formatCurrency';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationBell from '../components/layout/NotificationBell';
import { 
  Calendar, Clock, IndianRupee, Star, TrendingUp, Bell, 
  ChevronRight, Plus, Users as UsersIcon, CheckCircle, XCircle, Gift
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CompanionDashboard() {
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: user = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId) => {
      const booking = upcomingBookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      await base44.entities.Booking.update(bookingId, { 
        status: 'cancelled',
        escrow_status: 'refunded'
      });
      
      // Set availability back to available
      if (booking.availability_id) {
        await base44.entities.Availability.update(booking.availability_id, { 
          status: 'available'
        });
      }
      
      // Notify seeker about cancellation and refund
      await base44.entities.Notification.create({
        user_id: booking.seeker_id,
        type: 'booking_cancelled',
        title: '❌ Booking Cancelled',
        message: `${booking.companion_name} cancelled your booking. Full refund processed.`,
        booking_id: bookingId,
        action_url: createPageUrl('MyBookings')
      });
      
      await base44.entities.Notification.create({
        user_id: booking.seeker_id,
        type: 'payment_refunded',
        title: '💰 Refund Processed',
        message: `${formatCurrency(booking.total_amount)} has been refunded to your account`,
        amount: booking.total_amount,
        action_url: createPageUrl('MyBookings')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['active-availabilities'] });
      setCancelBookingId(null);
    }
  });

  const { data: pendingBookings = [] } = useQuery({
    queryKey: ['pending-bookings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'pending' 
      }, '-created_date', 20);
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });

  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ['upcoming-bookings', user?.id],
    queryFn: async () => {
      const allAccepted = await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'accepted' 
      }, '-created_date', 20);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return allAccepted.filter(b => {
        if (!b.date) return true;
        const bookingDate = new Date(b.date);
        return bookingDate >= today;
      });
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true
  });

  const { data: completedBookings = [] } = useQuery({
    queryKey: ['completed-bookings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'completed',
        escrow_status: 'released'
      }, '-created_date', 100);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['payouts', user?.id],
    queryFn: async () => {
      return await base44.entities.Payout.filter({ 
        companion_id: user.id 
      }, '-created_date', 50);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: systemRewardAmount = 100 } = useQuery({
    queryKey: ['system-reward-amount'],
    queryFn: async () => {
      const systemCampaign = await base44.entities.CampaignReferral.filter({ code: 'SYSTEM' });
      return systemCampaign[0]?.referral_reward_amount || 100;
    },
    staleTime: 10 * 60 * 1000
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.id, systemRewardAmount],
    queryFn: async () => {
      const allReferrals = await base44.entities.Referral.filter({ 
        referrer_id: user.id,
        referral_type: 'user_referral'
      }, '-created_date', 100);
      
      return allReferrals
        .filter(r => ['completed', 'rewarded'].includes(r.status))
        .map(r => ({ ...r, reward_amount: systemRewardAmount }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: activeAvailabilities = [] } = useQuery({
    queryKey: ['active-availabilities', user?.id],
    queryFn: async () => {
      const availabilities = await base44.entities.Availability.filter({ 
        companion_id: user.id, 
        status: 'available' 
      }, '-created_date', 50);
      
      const now = new Date();
      return availabilities.filter(a => {
        if (!a.date || !a.end_time) return false;
        
        const availDate = new Date(a.date);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // If date is in the past, it's expired
        if (availDate < todayStart) return false;
        
        // If date is today, check if there's at least 60 minutes remaining until end time
        if (availDate.toDateString() === now.toDateString()) {
          const [endHour, endMinute] = a.end_time.split(':').map(Number);
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // Calculate minutes remaining until end time
          const endTimeMinutes = endHour * 60 + endMinute;
          const currentTimeMinutes = currentHour * 60 + currentMinute;
          const minutesRemaining = endTimeMinutes - currentTimeMinutes;
          
          // Only show if at least 60 minutes remaining (same logic as ManageAvailability)
          return minutesRemaining >= 60;
        }
        
        return true;
      });
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000
  });

  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const approvedPayouts = payouts
    .filter(p => ['approved', 'processing'].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  // Use wallet_balance from user profile for available balance
  const availableBalance = Math.max(0, (user?.wallet_balance || 0) - pendingPayouts - approvedPayouts);
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);

  const avgRating = user?.average_rating;
  const hasRating = avgRating && user?.total_reviews > 0;

  const { data: groupEventsRaw = [] } = useQuery({
    queryKey: ['group-events-upcoming', user?.city],
    queryFn: async () => {
      const query = { status: 'open' };
      if (user?.city) query.city = user.city;
      return await base44.entities.GroupEvent.filter(query, '-date', 10);
    },
    enabled: !!user?.id
  });

  // Filter out past group events
  const groupEvents = React.useMemo(() => {
    const now = new Date();
    return groupEventsRaw.filter(event => {
      if (!event.date || !event.time) return true;
      
      const eventDate = new Date(event.date);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // If date is in the past
      if (eventDate < todayStart) return false;
      
      // If date is today, check if time has passed
      if (eventDate.toDateString() === now.toDateString()) {
        const [eventHour, eventMinute] = event.time.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        return !(eventHour < currentHour || (eventHour === currentHour && eventMinute <= currentMinute));
      }
      
      return true;
    });
  }, [groupEventsRaw]);

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-12" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm" style={{ color: 'rgba(45,52,54,0.7)' }}>Welcome back</p>
              <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{user?.display_name || user?.full_name || 'Companion'}</h1>
            </div>
            {user && (
              <div style={{ color: '#2D3436' }}>
                <NotificationBell user={user} />
              </div>
            )}
          </div>

          {/* Stats */}
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-3 backdrop-blur" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)' }}>
              <IndianRupee className="w-5 h-5 mb-1" style={{ color: '#2D3436' }} />
              <p className="text-2xl font-extrabold truncate" style={{ color: '#2D3436' }}>
                ₹{totalEarnings >= 10000 
                  ? `${Math.round(totalEarnings / 1000)}K` 
                  : Math.round(totalEarnings).toLocaleString('en-IN')}
              </p>
              <p className="text-xs" style={{ color: 'rgba(45,52,54,0.7)' }}>Total Earned</p>
            </Card>
            <Card className="p-3 backdrop-blur" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)' }}>
              <UsersIcon className="w-5 h-5 mb-1" style={{ color: '#2D3436' }} />
              <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{completedBookings.length}</p>
              <p className="text-xs" style={{ color: 'rgba(45,52,54,0.7)' }}>Meetups</p>
            </Card>
            <Card className="p-3 backdrop-blur" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)' }}>
              <Star className="w-5 h-5 mb-1" style={{ color: '#2D3436' }} />
              <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{hasRating ? avgRating.toFixed(1) : 'New'}</p>
              <p className="text-xs" style={{ color: 'rgba(45,52,54,0.7)' }}>Rating</p>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Quick Actions */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <Link 
            to={createPageUrl('ManageAvailability')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FFF3B8' }}>
                <Plus className="w-6 h-6" style={{ color: '#2D3436' }} />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: '#2D3436' }}>Add Availability</h3>
                <p className="text-sm" style={{ color: '#636E72' }}>
                  {activeAvailabilities.length} active slots
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: '#B2BEC3' }} />
          </Link>
        </Card>

        {/* Pending Requests */}
        {pendingBookings.length > 0 && (
          <Card className="p-4" style={{ background: '#FFF3B8', border: '1px solid #FFD93D' }}>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5" style={{ color: '#E6C235' }} />
              <h3 className="font-bold" style={{ color: '#2D3436' }}>Pending Requests</h3>
              <Badge className="font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>{pendingBookings.length}</Badge>
            </div>
            
            <div className="space-y-3">
              {pendingBookings.slice(0, 3).map((booking) => (
                <Link
                  key={booking.id}
                  to={createPageUrl(`BookingView?id=${booking.id}`)}
                  className="block bg-white rounded-xl p-3 border border-amber-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={booking.seeker_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'}
                      alt={booking.seeker_name}
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-amber-200"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{booking.seeker_name}</p>
                      <p className="text-sm text-slate-600">
                        {booking.date ? format(new Date(booking.date), 'MMM d') : 'TBD'} • {booking.start_time}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(booking.base_price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Upcoming Bookings */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Calendar className="w-5 h-5" style={{ color: '#74B9FF' }} />
              Upcoming Meetups
            </h3>
            <Link to={createPageUrl('CalendarView')} className="text-sm font-bold" style={{ color: '#FFB347' }}>
              View All
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <p className="text-center py-6" style={{ color: '#636E72' }}>No upcoming meetups</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="bg-slate-50 rounded-xl p-3"
                >
                  <Link
                    to={createPageUrl(`BookingView?id=${booking.id}`)}
                    className="block hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 p-2">
                      <img
                        src={booking.seeker_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'}
                        alt={booking.seeker_name}
                        className="w-14 h-14 rounded-xl object-cover ring-2 ring-slate-200"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{booking.seeker_name}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-3.5 h-3.5" />
                          {booking.date ? format(new Date(booking.date), 'EEE, MMM d') : 'TBD'}
                          <Clock className="w-3.5 h-3.5 ml-2" />
                          {booking.start_time}
                        </div>
                      </div>
                      <Badge className="font-bold" style={{ background: '#4ECDC4', color: '#2D3436' }}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Confirmed
                      </Badge>
                    </div>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelBookingId(booking.id)}
                    className="w-full mt-2 font-bold"
                    style={{ borderColor: '#E17055', color: '#E17055' }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Group Events */}
        {groupEvents.length > 0 && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: '#2D3436' }}>
                <UsersIcon className="w-5 h-5" style={{ color: '#A8A4FF' }} />
                Group Events
              </h3>
              <Link to={createPageUrl('GroupEvents')} className="text-sm font-bold" style={{ color: '#FFB347' }}>
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {groupEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  to={createPageUrl('GroupEvents')}
                  className="block bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-4 border border-violet-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{event.title || 'Group Meetup'}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {event.date ? format(new Date(event.date), 'EEE, MMM d') : 'TBD'} • {event.time}
                      </div>
                    </div>
                    <Badge className="bg-violet-200 text-violet-700">
                      Max {event.max_participants || 10}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>{event.language}</span>
                    <span>•</span>
                    <span>{event.venue_name || event.city}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Earnings Summary */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2" style={{ color: '#2D3436' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#4ECDC4' }} />
              Earnings This Month
            </h3>
            <Link to={createPageUrl('Wallet')} className="text-sm font-bold" style={{ color: '#FFB347' }}>
              Wallet
            </Link>
          </div>

          <div className={cn(
             "rounded-xl p-4 text-white transition-all",
             availableBalance >= 5000 
               ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
               : availableBalance >= 1000 
                 ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                 : "bg-gradient-to-br from-slate-500 to-slate-600"
           )}>
             <p className="text-white/80 text-sm mb-1">Available Balance</p>
             <p className="text-3xl font-bold mb-2">₹{Math.round(availableBalance || 0).toLocaleString('en-IN')}</p>
             <p className="text-white/80 text-sm">
               {completedBookings.length} meetups • {referrals.length} referrals
             </p>
           </div>
        </Card>

        {/* Referral Card */}
        <Link to={createPageUrl('Referrals')} className="block mt-6">
          <Card className="p-4 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #FFF3B8 0%, #FFE8CC 100%)', border: '1px solid #FFD93D' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FFD93D' }}>
                  <Gift className="w-6 h-6" style={{ color: '#2D3436' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#2D3436' }}>Refer & Earn</h3>
                  <p className="text-sm" style={{ color: '#636E72' }}>Get ₹{systemRewardAmount} per referral</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: '#B2BEC3' }} />
            </div>
          </Card>
        </Link>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              The seeker will receive a full refund. Cancelling confirmed bookings may affect your reliability score and future bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate(cancelBookingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}