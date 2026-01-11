import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { formatTime12Hour } from '../components/utils/timeFormat';
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
  const [user, setUser] = useState(null);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const cancelMutation = useMutation({
    mutationFn: async (bookingId) => {
      const booking = upcomingBookings.find(b => b.id === bookingId);
      await base44.entities.Booking.update(bookingId, { 
        status: 'cancelled',
        escrow_status: 'refunded'
      });
      // Set availability back to available
      if (booking?.availability_id) {
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
        message: `₹${booking.total_amount.toFixed(2)} has been refunded to your account`,
        amount: booking.total_amount,
        action_url: createPageUrl('MyBookings')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
      setCancelBookingId(null);
    }
  });

  const { data: pendingBookings = [] } = useQuery({
    queryKey: ['pending-bookings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'pending' 
      }, '-created_date', 10);
    },
    enabled: !!user?.id
  });

  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ['upcoming-bookings', user?.id],
    queryFn: async () => {
      const allAccepted = await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'accepted' 
      }, '-created_date', 10);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return allAccepted.filter(b => {
        if (!b.date) return true;
        const bookingDate = new Date(b.date);
        return bookingDate >= today;
      });
    },
    enabled: !!user?.id
  });

  const { data: completedBookings = [] } = useQuery({
    queryKey: ['completed-bookings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'completed' 
      }, '-created_date', 50);
    },
    enabled: !!user?.id
  });

  const { data: activeAvailabilities = [] } = useQuery({
    queryKey: ['active-availabilities', user?.id],
    queryFn: async () => {
      const availabilities = await base44.entities.Availability.filter({ 
        companion_id: user.id, 
        status: 'available' 
      }, '-created_date', 10);
      
      // Filter out past availabilities
      const now = new Date();
      return availabilities.filter(a => {
        const availDate = new Date(a.date);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // If date is in the past
        if (availDate < todayStart) return false;
        
        // If date is today, check if time has passed
        if (availDate.toDateString() === now.toDateString()) {
          const [endHour, endMinute] = a.end_time.split(':').map(Number);
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          return !(endHour < currentHour || (endHour === currentHour && endMinute <= currentMinute));
        }
        
        return true;
      });
    },
    enabled: !!user?.id
  });

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const avgRating = user?.average_rating;
  const hasRating = avgRating && user?.total_reviews > 0;

  const { data: groupEvents = [] } = useQuery({
    queryKey: ['group-events-upcoming', user?.city],
    queryFn: async () => {
      const query = { status: 'open' };
      if (user?.city) query.city = user.city;
      return await base44.entities.GroupEvent.filter(query, '-date', 10);
    },
    enabled: !!user?.id
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-violet-200 text-sm">Welcome back</p>
              <h1 className="text-2xl font-bold text-white">{user?.full_name || 'Companion'}</h1>
            </div>
            {user && (
              <div className="text-white">
                <NotificationBell user={user} />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <IndianRupee className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">₹{totalEarnings.toFixed(0)}</p>
              <p className="text-xs text-white/70">Total Earned</p>
            </Card>
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <UsersIcon className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">{completedBookings.length}</p>
              <p className="text-xs text-white/70">Meetups</p>
            </Card>
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <Star className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">{hasRating ? avgRating.toFixed(1) : 'New'}</p>
              <p className="text-xs text-white/70">Rating</p>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Quick Actions */}
        <Card className="p-4">
          <Link 
            to={createPageUrl('ManageAvailability')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Add Availability</h3>
                <p className="text-sm text-slate-600">
                  {activeAvailabilities.length} active slots
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        </Card>

        {/* Pending Requests */}
        {pendingBookings.length > 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Pending Requests</h3>
              <Badge className="bg-amber-200 text-amber-800">{pendingBookings.length}</Badge>
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
                    <span className="text-lg font-bold text-emerald-600">₹{booking.base_price}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Upcoming Bookings */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-600" />
              Upcoming Meetups
            </h3>
            <Link to={createPageUrl('ChatList')} className="text-sm text-violet-600 font-medium">
              View All
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <p className="text-center text-slate-500 py-6">No upcoming meetups</p>
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
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Confirmed
                      </Badge>
                    </div>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelBookingId(booking.id)}
                    className="w-full mt-2 border-red-200 text-red-600 hover:bg-red-50"
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
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-violet-600" />
                Group Events
              </h3>
              <Link to={createPageUrl('GroupEvents')} className="text-sm text-violet-600 font-medium">
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
                      {event.current_participants || 0}/{event.max_participants || 8}
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
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Earnings This Month
            </h3>
            <Link to={createPageUrl('Wallet')} className="text-sm text-violet-600 font-medium">
              Wallet
            </Link>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
            <p className="text-emerald-100 text-sm mb-1">Available Balance</p>
            <p className="text-3xl font-bold mb-2">₹{(user?.wallet_balance || 0).toFixed(2)}</p>
            <p className="text-emerald-100 text-sm">
              {completedBookings.length} completed meetups
            </p>
          </div>
        </Card>

        {/* Referral Card */}
        <Link to={createPageUrl('Referrals')}>
          <Card className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Refer & Earn</h3>
                  <p className="text-sm text-slate-600">Get ₹100 per referral</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
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