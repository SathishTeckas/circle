import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, ChevronRight, Filter, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ChatList() {
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStatus, setFilterStatus] = useState('accepted');

  const { data: user = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error loading user in ChatList:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const isCompanion = user?.user_role === 'companion';

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['chat-bookings', user?.id, isCompanion],
    queryFn: async () => {
      if (!user?.id) return [];
      const query = isCompanion 
        ? { companion_id: user.id }
        : { seeker_id: user.id };
      return await base44.entities.Booking.filter(query, '-updated_date', 50);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    staleTime: 5000
  });

  // Refetch when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allMessages = await base44.entities.Message.filter({ read: false }, '-created_date', 100);
      return allMessages.filter(m => m.sender_id !== user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    staleTime: 5000
  });

  const getUnreadCount = (bookingId) => {
    return unreadMessages.filter(m => m.booking_id === bookingId).length;
  };

  const filteredBookings = bookings.filter(booking => {
    const unreadCount = getUnreadCount(booking.id);
    
    // Filter by unread
    if (filterUnread && unreadCount === 0) return false;
    
    // Filter by status
    if (filterStatus !== 'all' && booking.status !== filterStatus) return false;
    
    return true;
  });

  const hasActiveFilters = filterUnread || filterStatus !== 'all';
  const activeStatus = bookings.filter(b => b.status === 'accepted').length;
  const completedStatus = bookings.filter(b => b.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-sm text-slate-600">Chat with your {isCompanion ? 'guests' : 'companions'}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Filter Bar */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterUnread ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterUnread(!filterUnread)}
              className={cn(
                "h-9 rounded-lg text-xs",
                filterUnread && "bg-violet-600 hover:bg-violet-700"
              )}
            >
              Unread Only
            </Button>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "h-9 rounded-lg text-xs",
                  filterStatus === 'all' && "bg-violet-600 hover:bg-violet-700"
                )}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'accepted' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus('accepted')}
                className={cn(
                  "h-9 rounded-lg text-xs",
                  filterStatus === 'accepted' && "bg-violet-600 hover:bg-violet-700"
                )}
              >
                Active ({activeStatus})
              </Button>
              <Button
                variant={filterStatus === 'completed' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus('completed')}
                className={cn(
                  "h-9 rounded-lg text-xs",
                  filterStatus === 'completed' && "bg-violet-600 hover:bg-violet-700"
                )}
              >
                Completed ({completedStatus})
              </Button>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterUnread(false);
                  setFilterStatus('all');
                }}
                className="h-9 text-xs text-slate-500 hover:text-slate-700"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {hasActiveFilters ? 'No conversations match filters' : 'No conversations yet'}
            </h3>
            <p className="text-slate-600">
              {hasActiveFilters 
                ? 'Try adjusting your filters'
                : isCompanion 
                ? 'Accept a booking to start chatting'
                : 'Book a companion to start chatting'
              }
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterUnread(false);
                  setFilterStatus('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
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
          <div className="space-y-3 pb-6">
            {filteredBookings.map((booking, idx) => {
              const otherName = isCompanion 
                ? (booking?.seeker_display_name || booking?.seeker_name || 'Anonymous')
                : (booking?.companion_display_name || booking?.companion_name || 'Anonymous');
              const otherPhoto = isCompanion ? booking?.seeker_photo : booking?.companion_photo;
              const unreadCount = getUnreadCount(booking?.id);

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={cn(
                    "p-4 hover:shadow-md transition-all",
                    unreadCount > 0 && "border-violet-200 bg-violet-50/50"
                  )}>
                    <Link to={createPageUrl(`ChatView?id=${booking.id}`)}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={otherPhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'}
                            alt={otherName}
                            className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-200"
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
                              {otherName}
                            </h3>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          </div>
                          
                          <p className="text-xs text-slate-500 mb-2">
                            Booking ID: {booking?.id?.slice(0, 8).toUpperCase() || 'N/A'}
                          </p>
                          
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <Badge className="bg-violet-100 text-violet-700 animate-pulse">
                                {unreadCount} new
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}