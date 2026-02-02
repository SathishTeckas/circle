import React, { useState } from 'react';
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
  const [statusFilter, setStatusFilter] = useState(['pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled']);

  const { data: user = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const isCompanion = user?.active_role === 'companion' || (user?.user_role === 'companion' && !user?.active_role);

  const { data: bookings = [] } = useQuery({
    queryKey: ['calendar-bookings', user?.id, isCompanion],
    queryFn: async () => {
      const query = isCompanion 
        ? { companion_id: user.id }
        : { seeker_id: user.id };
      return await base44.entities.Booking.filter(query, '-created_date', 100);
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true
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
    enabled: !!user?.id && isCompanion,
    staleTime: 60 * 1000
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
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b px-4 py-4" style={{ borderColor: '#DFE6E9' }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>Meetups</h1>
          <p className="text-sm" style={{ color: '#636E72' }}>
            {isCompanion ? 'Manage your availability and bookings' : 'View your upcoming bookings'}
          </p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* All Bookings List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#2D3436' }}>Your Meetups</h2>

          {/* Status Filters */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold" style={{ color: '#2D3436' }}>Filter by status:</span>
              {statusFilter.length < allStatuses.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter(allStatuses.map(s => s.value))}
                  className="h-8 font-bold"
                  style={{ color: '#FFB347', borderColor: '#FFD93D' }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {filteredBookings.length === 0 ? (
            <Card className="p-8 text-center" style={{ background: '#FFF3B8', border: 'none' }}>
              <CalendarIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#FFD93D' }} />
              <h3 className="font-bold mb-1" style={{ color: '#2D3436' }}>No bookings yet</h3>
              <p className="text-sm" style={{ color: '#636E72' }}>
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
                  <Card className="p-4 hover:shadow-md transition-all border-l-4" style={{ background: '#FFFFFF', borderLeftColor: '#FFD93D', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {isCompanion 
                            ? (booking.seeker_display_name || booking.seeker_name)
                            : (booking.companion_display_name || booking.companion_name)
                          }
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
                        (() => {
                          // Check if booking is currently in progress
                          const now = new Date();
                          const bookingDate = new Date(booking.date);
                          const [startHour, startMinute] = booking.start_time.split(':').map(Number);
                          const [endHour, endMinute] = booking.end_time.split(':').map(Number);
                          
                          const startTime = new Date(bookingDate);
                          startTime.setHours(startHour, startMinute, 0);
                          
                          const endTime = new Date(bookingDate);
                          endTime.setHours(endHour, endMinute, 0);
                          
                          const isHappeningNow = booking.status === 'accepted' && now >= startTime && now <= endTime;
                          
                          if (isHappeningNow) return 'bg-blue-100 text-blue-700';
                          if (booking.status === 'accepted') return 'bg-emerald-100 text-emerald-700';
                          if (booking.status === 'pending') return 'bg-amber-100 text-amber-700';
                          if (booking.status === 'completed') return 'bg-slate-100 text-slate-700';
                          if (booking.status === 'in_progress') return 'bg-blue-100 text-blue-700';
                          return 'bg-slate-100 text-slate-700';
                        })()
                      }>
                        {(() => {
                          // Check if booking is currently in progress
                          const now = new Date();
                          const bookingDate = new Date(booking.date);
                          const [startHour, startMinute] = booking.start_time.split(':').map(Number);
                          const [endHour, endMinute] = booking.end_time.split(':').map(Number);
                          
                          const startTime = new Date(bookingDate);
                          startTime.setHours(startHour, startMinute, 0);
                          
                          const endTime = new Date(bookingDate);
                          endTime.setHours(endHour, endMinute, 0);
                          
                          const isHappeningNow = booking.status === 'accepted' && now >= startTime && now <= endTime;
                          
                          return isHappeningNow ? 'In Progress' : booking.status;
                        })()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-900">₹{booking.base_price?.toFixed(2)}</span>
                        <span className="text-xs text-slate-500">ID: {booking.id?.slice(0, 8)}</span>
                      </div>
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