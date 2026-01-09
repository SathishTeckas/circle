import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { formatTime12Hour } from '../components/utils/timeFormat';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MessageCircle, Send, MapPin, Shield, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import BlockUserButton from '../components/profile/BlockUserButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatView() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [lastMessageCount, setLastMessageCount] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const results = await base44.entities.Booking.filter({ id: bookingId });
      return results[0];
    },
    enabled: !!bookingId
  });

  // Check if chat is available (24 hours after meetup for cancelled/completed)
  const isChatAvailable = () => {
    if (!booking?.chat_enabled) return false;
    
    if (['cancelled', 'completed'].includes(booking.status)) {
      if (!booking.date || !booking.start_time) return false;
      
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const meetupDateTime = new Date(booking.date);
      meetupDateTime.setHours(hours, minutes, 0, 0);
      
      const twentyFourHoursAfter = new Date(meetupDateTime);
      twentyFourHoursAfter.setHours(twentyFourHoursAfter.getHours() + 24);
      
      return new Date() < twentyFourHoursAfter;
    }
    
    return true;
  };

  const chatAvailable = booking ? isChatAvailable() : false;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', bookingId],
    queryFn: async () => {
      return await base44.entities.Message.filter({ booking_id: bookingId }, 'created_date', 100);
    },
    enabled: !!bookingId && chatAvailable,
    refetchInterval: 2000
  });

  // Mark messages as read and show notifications for new messages
  useEffect(() => {
    if (!messages.length || !user?.id) return;

    const unreadMessages = messages.filter(m => !m.read && m.sender_id !== user.id);
    
    // Mark unread messages as read
    unreadMessages.forEach(async (msg) => {
      try {
        await base44.entities.Message.update(msg.id, { read: true });
      } catch (e) {
        console.error('Failed to mark message as read:', e);
      }
    });

    // Show notification for new messages
    if (messages.length > lastMessageCount && lastMessageCount > 0) {
      const newMessages = messages.slice(lastMessageCount);
      const newFromOther = newMessages.filter(m => m.sender_id !== user.id);
      
      if (newFromOther.length > 0 && document.hidden) {
        const lastMsg = newFromOther[newFromOther.length - 1];
        showNotification(lastMsg.sender_name, lastMsg.content);
      }
    }

    setLastMessageCount(messages.length);
  }, [messages, user?.id, lastMessageCount]);

  const showNotification = (senderName, content) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(senderName || 'New Message', {
        body: content.substring(0, 100),
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: bookingId
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  };

  const { data: suggestedVenues = [] } = useQuery({
    queryKey: ['suggested-venues', booking?.city],
    queryFn: async () => {
      const query = { verified: true };
      if (booking?.city) query.city = booking.city;
      const results = await base44.entities.Venue.filter(query, '-created_date', 20);
      // Prioritize venues in the same area if available
      if (booking?.area) {
        const areaMatches = results.filter(v => v.area === booking.area);
        const others = results.filter(v => v.area !== booking.area);
        return [...areaMatches, ...others];
      }
      return results;
    },
    enabled: !!booking?.city && chatAvailable
  });

  const isSeeker = user?.id === booking?.seeker_id;

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        booking_id: bookingId,
        sender_id: user.id,
        sender_name: user.full_name,
        content
      });

      // Create notification for the other party
      const otherUserId = isSeeker ? booking.companion_id : booking.seeker_id;
      await base44.entities.Notification.create({
        user_id: otherUserId,
        type: 'new_message',
        title: '💬 New Message',
        message: `${user.full_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        booking_id: bookingId,
        action_url: createPageUrl(`ChatView?id=${bookingId}`)
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  });

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!message.trim() || !user?.id || !booking || sendMessageMutation.isPending) return;
    
    try {
      await sendMessageMutation.mutateAsync(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  const otherPartyName = isSeeker ? booking?.companion_name : booking?.seeker_name;
  const otherPartyPhoto = isSeeker ? booking?.companion_photo : booking?.seeker_photo;
  const otherPartyId = isSeeker ? booking?.companion_id : booking?.seeker_id;

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      return await base44.entities.BlockedUser.filter({ blocker_id: user.id });
    },
    enabled: !!user?.id
  });

  const isBlocked = blockedUsers.some(b => b.blocked_id === otherPartyId);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chatAvailable) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
          <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="font-semibold text-slate-900">Chat</h1>
          </div>
        </div>
        
        <div className="px-4 py-12 max-w-lg mx-auto">
          <Card className="p-6 text-center bg-slate-50">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Chat Not Available</h3>
            <p className="text-sm text-slate-600">
              {booking.chat_enabled && ['cancelled', 'completed'].includes(booking.status)
                ? 'Chat access has expired (24 hours after meetup time)'
                : 'Chat will be available once the booking is confirmed'
              }
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 flex-shrink-0">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <img
              src={otherPartyPhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
              alt={otherPartyName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-slate-900">{otherPartyName || 'Chat'}</h1>
              <p className="text-xs text-slate-500 truncate">
                Booking ID: {booking.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="w-5 h-5 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <div className="w-full">
                  <BlockUserButton 
                    userId={otherPartyId}
                    userName={otherPartyName}
                    isBlocked={isBlocked}
                    className="w-full"
                  />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Suggested Venues */}
      {suggestedVenues.length > 0 && (
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border-b border-violet-100 px-4 py-4 flex-shrink-0">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Suggested Restaurants</p>
                  <p className="text-xs text-slate-600">{booking.area || booking.city} • Verified venues</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {suggestedVenues.map(venue => (
                <button
                  key={venue.id}
                  onClick={() => setMessage(`How about meeting at ${venue.name}?\n📍 ${venue.address}${venue.has_cctv ? '\n🎥 CCTV available for safety' : ''}`)}
                  className="flex-shrink-0 bg-white border-2 border-violet-200 rounded-2xl p-4 hover:border-violet-400 hover:shadow-md transition-all text-left min-w-[240px] group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-slate-900 text-sm leading-tight pr-2">{venue.name}</p>
                    {venue.verified && (
                      <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-2 line-clamp-1">{venue.address}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                      {venue.area || venue.city}
                    </span>
                    {venue.has_cctv && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                        🎥 CCTV
                      </span>
                    )}
                    {venue.type && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full capitalize">
                        {venue.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-violet-600 mt-2 group-hover:text-violet-700 font-medium">
                    Tap to suggest →
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 max-w-lg mx-auto w-full space-y-3">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  msg.sender_id === user?.id ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-2xl",
                  msg.sender_id === user?.id
                    ? "bg-violet-600 text-white rounded-br-md"
                    : "bg-white text-slate-900 rounded-bl-md shadow-sm"
                )}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <div className="text-center py-16">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 shadow-lg flex-shrink-0">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="h-12 rounded-xl flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="h-12 w-12 rounded-xl bg-violet-600 hover:bg-violet-700 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}