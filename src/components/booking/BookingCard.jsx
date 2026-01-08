import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Calendar, Clock, MapPin, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-violet-100 text-violet-700' },
  no_show_companion: { label: 'No Show', color: 'bg-red-100 text-red-700' },
  no_show_seeker: { label: 'No Show', color: 'bg-red-100 text-red-700' },
  disputed: { label: 'Disputed', color: 'bg-orange-100 text-orange-700' },
};

export default function BookingCard({ booking, userRole }) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const isSeeker = userRole === 'seeker';
  const otherPartyName = isSeeker ? booking.companion_name : booking.seeker_name;
  const otherPartyPhoto = isSeeker ? booking.companion_photo : booking.seeker_photo;

  return (
    <Link
      to={createPageUrl(`BookingView?id=${booking.id}`)}
      className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-violet-200 transition-all hover:shadow-md"
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={otherPartyPhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'}
            alt={otherPartyName}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-900 truncate">
              {otherPartyName || 'Anonymous'}
            </h3>
            <Badge className={cn("ml-2 flex-shrink-0", status.color)}>
              {status.label}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-500" />
              <span>
                {booking.date ? format(new Date(booking.date), 'EEE, MMM d') : 'TBD'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <span>{booking.start_time} - {booking.end_time}</span>
            </div>
            {booking.venue_name && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-500" />
                <span className="truncate">{booking.venue_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <span className="text-lg font-bold text-slate-900">
          ₹{booking.total_amount}
        </span>
        {booking.status === 'completed' ? (
          <Link
            to={createPageUrl(`LeaveReview?id=${booking.id}`)}
            onClick={(e) => e.stopPropagation()}
            className="text-violet-600 text-sm font-medium hover:underline"
          >
            Leave Review
          </Link>
        ) : booking.chat_enabled && (
          <div className="flex items-center gap-1 text-violet-600 text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>Chat available</span>
          </div>
        )}
      </div>
    </Link>
  );
}