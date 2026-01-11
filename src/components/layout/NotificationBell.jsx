import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../../utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export default function NotificationBell({ user }) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      const notifications = await base44.entities.Notification.filter(
        { user_id: user.id, read: false },
        '-created_date',
        50
      );
      return notifications.length;
    },
    enabled: !!user?.id,
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  return (
    <Link to={createPageUrl('Notifications')} className="flex-shrink-0">
      <button className="bg-slate-50 p-2 rounded-full relative hover:bg-slate-100 transition-colors">
        <Bell className="w-6 h-6 text-slate-700" />
        {unreadCount > 0 &&
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        }
      </button>
    </Link>);

}