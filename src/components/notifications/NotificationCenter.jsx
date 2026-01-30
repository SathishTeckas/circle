import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, X, Gift, CheckCircle, AlertCircle, 
  DollarSign, Users, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const notificationIcons = {
  payment_received: { icon: DollarSign, iconColor: '#4ECDC4', bgColor: '#4ECDC4' },
  referral_bonus: { icon: Gift, iconColor: '#A8A4FF', bgColor: '#A8A4FF' },
  booking_request: { icon: Users, iconColor: '#74B9FF', bgColor: '#74B9FF' },
  booking_accepted: { icon: CheckCircle, iconColor: '#4ECDC4', bgColor: '#4ECDC4' },
  booking_rejected: { icon: AlertCircle, iconColor: '#FF6B6B', bgColor: '#FF6B6B' },
  booking_cancelled: { icon: AlertCircle, iconColor: '#FFB347', bgColor: '#FFB347' },
  review_received: { icon: CheckCircle, iconColor: '#74B9FF', bgColor: '#74B9FF' },
  payout_processed: { icon: DollarSign, iconColor: '#4ECDC4', bgColor: '#4ECDC4' },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const all = await base44.entities.Notification.list('-created_date', 50);
      return all.filter(n => n.user_id === user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 3000 // Refetch every 3 seconds for real-time updates
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      }
    });

    return unsubscribe;
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.update(notificationId, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('Notification deleted');
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(
        unread.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative w-10 h-10 rounded-lg transition-colors flex items-center justify-center"
          style={{ background: open ? '#FFF3B8' : 'transparent' }}
        >
          <Bell className="w-5 h-5" style={{ color: '#2D3436' }} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold" style={{ background: '#FF6B6B', color: '#FFFFFF' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-12 w-96 max-h-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#DFE6E9', background: '#FFF3B8' }}>
                <h3 className="font-bold" style={{ color: '#2D3436' }}>Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs h-8"
                    >
                      Mark all as read
                    </Button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-6 h-6 hover:bg-slate-200 rounded flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notification) => {
                      const iconConfig = notificationIcons[notification.type] || notificationIcons.payment_received;
                      const Icon = iconConfig.icon;

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => handleNotificationClick(notification)}
                          className="p-4 transition-colors cursor-pointer border-l-4"
                          style={{
                            borderColor: notification.read ? '#DFE6E9' : '#FFD93D',
                            background: notification.read ? '#FFFFFF' : '#FFF3B8'
                          }}
                        >
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}20` }}>
                              <Icon className="w-5 h-5" style={{ color: iconConfig.iconColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-bold text-sm" style={{ color: notification.read ? '#636E72' : '#2D3436' }}>
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#FFD93D' }} />
                                )}
                              </div>
                              <p className="text-xs line-clamp-2" style={{ color: '#636E72' }}>
                                {notification.message}
                              </p>
                              <p className="text-xs mt-1" style={{ color: '#B2BEC3' }}>
                                {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                              className="flex-shrink-0 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}