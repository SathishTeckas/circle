import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, DollarSign, Star, TrendingUp, Bell, 
  ChevronRight, Plus, Users, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CompanionDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

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
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'accepted' 
      }, '-created_date', 10);
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
      return await base44.entities.Availability.filter({ 
        companion_id: user.id, 
        status: 'available' 
      }, '-created_date', 10);
    },
    enabled: !!user?.id
  });

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const avgRating = user?.average_rating || 4.8;

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
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Bell className="w-6 h-6" />
              </Button>
              {pendingBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingBookings.length}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <DollarSign className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">₹{totalEarnings.toFixed(0)}</p>
              <p className="text-xs text-white/70">Total Earned</p>
            </Card>
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <Users className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">{completedBookings.length}</p>
              <p className="text-xs text-white/70">Meetups</p>
            </Card>
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <Star className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
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
                  className="block bg-white rounded-xl p-3 border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={booking.seeker_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                      alt={booking.seeker_name}
                      className="w-10 h-10 rounded-lg object-cover"
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
                <Link
                  key={booking.id}
                  to={createPageUrl(`BookingView?id=${booking.id}`)}
                  className="block bg-slate-50 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={booking.seeker_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                      alt={booking.seeker_name}
                      className="w-10 h-10 rounded-lg object-cover"
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
              ))}
            </div>
          )}
        </Card>

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
      </div>
    </div>
  );
}