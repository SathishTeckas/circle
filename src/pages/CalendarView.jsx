import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { formatTime12Hour } from '../components/utils/timeFormat';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CalendarView() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState(['pending', 'accepted', 'in_progress']);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const isCompanion = user?.user_role === 'companion';

  const { data: bookings = [] } = useQuery({
    queryKey: ['calendar-bookings', user?.id, isCompanion],
    queryFn: async () => {
      const query = isCompanion 
        ? { companion_id: user.id }
        : { seeker_id: user.id };
      return await base44.entities.Booking.filter(query, '-created_date', 100);
    },
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  const { data: availabilities = [] } = useQuery({
    queryKey: ['calendar-availabilities', user?.id],
    queryFn: async () => {
      return await base44.entities.Availability.filter(
        { companion_id: user.id }, 
        '-date', 
        100
      );
    },
    enabled: !!user?.id && isCompanion
  });

  const filteredBookings = bookings.filter(b => statusFilter.includes(b.status));

  const allStatuses = [
    { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    { value: 'accepted', label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Completed', color: 'bg-slate-100 text-slate-700' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
  ];

  const toggleStatus = (status) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter(s => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-600">
            {isCompanion ? 'Manage your availability and bookings' : 'View your upcoming bookings'}
          </p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* All Bookings List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Bookings</h2>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allStatuses.map((status) => (
              <Badge
                key={status.value}
                onClick={() => toggleStatus(status.value)}
                className={cn(
                  "cursor-pointer transition-all",
                  statusFilter.includes(status.value)
                    ? status.color
                    : "bg-slate-100 text-slate-400 opacity-50 hover:opacity-70"
                )}
              >
                {status.label}
                {statusFilter.includes(status.value) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-1">No bookings yet</h3>
              <p className="text-sm text-slate-600">
                {isCompanion ? 'Your bookings will appear here' : 'Book a companion to get started'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => (
                <Link 
                  key={booking.id} 
                  to={createPageUrl(`BookingView?id=${booking.id}`)}
                  className="block"
                >
                  <Card className="p-4 hover:shadow-md transition-all border-l-4 border-l-violet-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {isCompanion ? booking.seeker_name : booking.companion_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatTime12Hour(booking.start_time)} - {formatTime12Hour(booking.end_time)}
                        </p>
                        {booking.venue_name && (
                          <p className="text-xs text-slate-500 mt-1">📍 {booking.venue_name}</p>
                        )}
                      </div>
                      <Badge className={
                        booking.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-medium text-slate-900">₹{booking.total_amount}</span>
                      <span className="text-xs text-slate-500">{booking.duration_hours}h</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}