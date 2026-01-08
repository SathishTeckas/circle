import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl, formatTime12Hour } from '../utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CalendarView() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

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
      return await base44.entities.Booking.filter(query, '-date', 100);
    },
    enabled: !!user?.id
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === dateStr);
    const dayAvailabilities = availabilities.filter(a => a.date === dateStr && a.status === 'available');
    return { bookings: dayBookings, availabilities: dayAvailabilities };
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-600">
            {isCompanion ? 'Manage your availability and bookings' : 'View your upcoming bookings'}
          </p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Month Navigation */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h2 className="text-xl font-bold text-slate-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
            
            {daysInMonth.map((day, idx) => {
              const events = getEventsForDate(day);
              const hasBookings = events.bookings.length > 0;
              const hasAvailability = events.availabilities.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <motion.button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square rounded-xl p-1 text-sm transition-all relative",
                    isSelected && "bg-violet-600 text-white shadow-lg",
                    !isSelected && isToday && "bg-violet-100 text-violet-900 font-semibold",
                    !isSelected && !isToday && "hover:bg-slate-100"
                  )}
                >
                  <div className="text-center">{format(day, 'd')}</div>
                  <div className="flex gap-1 justify-center mt-1">
                    {hasBookings && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white" : "bg-violet-600"
                      )} />
                    )}
                    {hasAvailability && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white" : "bg-emerald-500"
                      )} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-violet-600 rounded-full" />
              <span className="text-xs text-slate-600">Bookings</span>
            </div>
            {isCompanion && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-xs text-slate-600">Available</span>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        {isCompanion && (
          <Link to={createPageUrl('ManageAvailability')}>
            <Button className="w-full h-12 bg-violet-600 hover:bg-violet-700 rounded-xl">
              <Plus className="w-5 h-5 mr-2" />
              Add Availability
            </Button>
          </Link>
        )}

        {/* Selected Day Events */}
        {selectedDate && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-4">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>

            {selectedEvents.bookings.length === 0 && selectedEvents.availabilities.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No events on this day</p>
            ) : (
              <div className="space-y-3">
                {/* Bookings */}
                {selectedEvents.bookings.map((booking) => (
                  <Link 
                    key={booking.id} 
                    to={createPageUrl(`BookingView?id=${booking.id}`)}
                    className="block"
                  >
                    <Card className="p-3 hover:shadow-md transition-all bg-violet-50 border-violet-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {isCompanion ? booking.seeker_name : booking.companion_name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatTime12Hour(booking.start_time)} - {formatTime12Hour(booking.end_time)}
                          </p>
                        </div>
                        <Badge className={
                          booking.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                          booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}

                {/* Availabilities */}
                {isCompanion && selectedEvents.availabilities.map((slot) => (
                  <Card key={slot.id} className="p-3 bg-emerald-50 border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Available Slot</p>
                        <p className="text-sm text-slate-600">
                          {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)} • ₹{slot.price_per_hour}/hr
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        Open
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}