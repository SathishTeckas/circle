import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Calendar, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ChatList() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const isCompanion = user?.user_role === 'companion';

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['chat-bookings', user?.id, isCompanion],
    queryFn: async () => {
      const query = isCompanion 
        ? { companion_id: user.id, chat_enabled: true }
        : { seeker_id: user.id, chat_enabled: true };
      return await base44.entities.Booking.filter(query, '-updated_date', 50);
    },
    enabled: !!user?.id
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      // Get messages where current user is not the sender and message is unread
      const allMessages = await base44.entities.Message.filter({ read: false }, '-created_date', 100);
      return allMessages.filter(m => m.sender_id !== user.id);
    },
    enabled: !!user?.id
  });

  const getUnreadCount = (bookingId) => {
    return unreadMessages.filter(m => m.booking_id === bookingId).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-sm text-slate-600">Chat with your {isCompanion ? 'guests' : 'companions'}</p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No conversations yet</h3>
            <p className="text-slate-600">
              {isCompanion 
                ? 'Accept a booking to start chatting'
                : 'Book a companion to start chatting'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking, idx) => {
              const otherName = isCompanion ? booking.seeker_name : booking.companion_name;
              const otherPhoto = isCompanion ? booking.seeker_photo : booking.companion_photo;
              const unreadCount = getUnreadCount(booking.id);

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link to={createPageUrl(`BookingView?id=${booking.id}`)}>
                    <Card className={cn(
                      "p-4 hover:shadow-md transition-all",
                      unreadCount > 0 && "border-violet-200 bg-violet-50/50"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={otherPhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                            alt={otherName}
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-xs rounded-full flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {otherName || 'Anonymous'}
                            </h3>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {booking.date ? format(new Date(booking.date), 'MMM d') : 'TBD'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {booking.start_time}
                            </div>
                          </div>
                          
                          <Badge className={cn(
                            "mt-2",
                            booking.status === 'accepted' 
                              ? "bg-emerald-100 text-emerald-700"
                              : booking.status === 'completed'
                              ? "bg-violet-100 text-violet-700"
                              : "bg-slate-100 text-slate-700"
                          )}>
                            {booking.status === 'accepted' ? 'Confirmed' : 
                             booking.status === 'completed' ? 'Completed' : booking.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}