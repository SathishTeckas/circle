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
  payment_received: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  referral_bonus: { icon: Gift, color: 'text-violet-600', bg: 'bg-violet-100' },
  booking_request: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  booking_accepted: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  booking_rejected: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  booking_cancelled: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
  review_received: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  payout_processed: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
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
          className="relative w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
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
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
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
                          className={cn(
                            'p-4 hover:bg-slate-50 transition-colors cursor-pointer border-l-4',
                            notification.read
                              ? 'border-slate-200 bg-white'
                              : 'border-violet-500 bg-violet-50/50'
                          )}
                        >
                          <div className="flex gap-3">
                            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconConfig.bg)}>
                              <Icon className={cn('w-5 h-5', iconConfig.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <p className={cn('font-medium text-sm', notification.read ? 'text-slate-700' : 'text-slate-900')}>
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
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