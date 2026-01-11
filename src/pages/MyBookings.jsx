import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock } from 'lucide-react';
import BookingCard from '@/components/booking/BookingCard';
import { motion } from 'framer-motion';

export default function MyBookings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      const allBookings = await base44.entities.Booking.filter({ seeker_id: user.id }, '-created_date', 100);
      return allBookings;
    },
    enabled: !!user?.id,
    refetchInterval: 2000,
    staleTime: 0
  });

  const upcomingStatuses = ['pending', 'accepted', 'in_progress'];
  const pastStatuses = ['completed', 'rejected', 'cancelled', 'no_show_companion', 'no_show_seeker', 'disputed'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingBookings = bookings.filter(b => {
    if (upcomingStatuses.includes(b.status)) return true;
    if (!b.date) return false;
    const bookingDate = new Date(b.date);
    return bookingDate >= today;
  });
  
  const pastBookings = bookings.filter(b => {
    if (pastStatuses.includes(b.status)) return true;
    if (upcomingStatuses.includes(b.status)) return false;
    if (!b.date) return false;
    const bookingDate = new Date(b.date);
    return bookingDate < today;
  });

  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">My Bookings</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-slate-100 p-1 rounded-xl">
              <TabsTrigger 
                value="upcoming" 
                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger 
                value="past"
                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Past ({pastBookings.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : displayBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No {activeTab} bookings
            </h3>
            <p className="text-slate-600">
              {activeTab === 'upcoming' 
                ? 'Start by discovering companions'
                : 'Your completed bookings will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayBookings.map((booking, idx) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <BookingCard booking={booking} userRole="seeker" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}