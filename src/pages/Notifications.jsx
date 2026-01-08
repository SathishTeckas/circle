import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Bell, CheckCircle, AlertCircle, Calendar, 
  MessageCircle, Star, Clock, IndianRupee, XCircle, Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const NOTIFICATION_ICONS = {
  booking_request: { icon: Calendar, color: 'bg-violet-100 text-violet-600' },
  booking_accepted: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
  booking_rejected: { icon: XCircle, color: 'bg-red-100 text-red-600' },
  booking_cancelled: { icon: AlertCircle, color: 'bg-orange-100 text-orange-600' },
  payment_received: { icon: IndianRupee, color: 'bg-green-100 text-green-600' },
  payment_refunded: { icon: Wallet, color: 'bg-blue-100 text-blue-600' },
  new_message: { icon: MessageCircle, color: 'bg-blue-100 text-blue-600' },
  review_received: { icon: Star, color: 'bg-amber-100 text-amber-600' },
  booking_reminder: { icon: Clock, color: 'bg-purple-100 text-purple-600' },
  payout_processed: { icon: Wallet, color: 'bg-emerald-100 text-emerald-600' }
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      return await base44.entities.Notification.filter(
        { user_id: user.id }, 
        '-created_date', 
        50
      );
    },
    enabled: !!user?.id,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.update(notificationId, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifs.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

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
              <Button 
                variant="ghost" 
                className="text-violet-600 text-sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all read'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
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
              const iconConfig = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.booking_request;
              const Icon = iconConfig.icon;
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      notification.read ? 'bg-white' : 'bg-violet-50 border-violet-200'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${iconConfig.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
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
                        {notification.amount && (
                          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 mb-2">
                            <IndianRupee className="w-4 h-4" />
                            {notification.amount.toFixed(2)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {format(new Date(notification.created_date), 'MMM d, h:mm a')}
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