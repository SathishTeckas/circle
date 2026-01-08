import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Bell, CheckCircle, AlertCircle, Calendar, 
  MessageCircle, Star, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Notifications() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Mock notifications - in production this would be from a real entity
  const notifications = [
    {
      id: 1,
      type: 'booking',
      title: 'New Booking Request',
      message: 'Sarah wants to book you for tomorrow at 6 PM',
      time: new Date(),
      read: false,
      icon: Calendar,
      color: 'bg-violet-100 text-violet-600'
    },
    {
      id: 2,
      type: 'message',
      title: 'New Message',
      message: 'John sent you a message about the meetup',
      time: new Date(Date.now() - 3600000),
      read: false,
      icon: MessageCircle,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 3,
      type: 'review',
      title: 'New Review',
      message: 'Emma left you a 5-star review!',
      time: new Date(Date.now() - 7200000),
      read: true,
      icon: Star,
      color: 'bg-amber-100 text-amber-600'
    },
    {
      id: 4,
      type: 'booking',
      title: 'Booking Confirmed',
      message: 'Your meetup with Mike is confirmed for Friday',
      time: new Date(Date.now() - 86400000),
      read: true,
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-600'
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
              <div>
                <h1 className="font-semibold text-slate-900">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-slate-600">{unreadCount} unread</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" className="text-violet-600 text-sm">
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications yet</h3>
            <p className="text-slate-600">We'll notify you when something happens</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, idx) => {
              const Icon = notification.icon;
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`p-4 ${notification.read ? 'bg-white' : 'bg-violet-50 border-violet-200'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${notification.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-violet-600 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {format(notification.time, 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
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