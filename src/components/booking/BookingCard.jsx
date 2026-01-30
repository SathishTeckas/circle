import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Calendar, Clock, MapPin, MessageCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Pending', bgColor: '#FFF3B8', textColor: '#2D3436' },
  accepted: { label: 'Confirmed', bgColor: '#4ECDC4', textColor: '#2D3436' },
  rejected: { label: 'Declined', bgColor: '#FF6B6B', textColor: '#FFFFFF' },
  cancelled: { label: 'Cancelled', bgColor: '#DFE6E9', textColor: '#636E72' },
  in_progress: { label: 'In Progress', bgColor: '#74B9FF', textColor: '#2D3436' },
  completed: { label: 'Completed', bgColor: '#A8A4FF', textColor: '#FFFFFF' },
  no_show_companion: { label: 'No Show', bgColor: '#FF6B6B', textColor: '#FFFFFF' },
  no_show_seeker: { label: 'No Show', bgColor: '#FF6B6B', textColor: '#FFFFFF' },
  disputed: { label: 'Disputed', bgColor: '#FFB347', textColor: '#2D3436' },
};

export default function BookingCard({ booking, userRole }) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const isSeeker = userRole === 'seeker';
  
  // Use display_name if available, fallback to companion_name/seeker_name
  const otherPartyName = isSeeker 
    ? (booking.companion_display_name || booking.companion_name)
    : (booking.seeker_display_name || booking.seeker_name);
  const otherPartyPhoto = isSeeker ? booking.companion_photo : booking.seeker_photo;

  return (
    <Link
      to={createPageUrl(`BookingView?id=${booking.id}`)}
      className="block bg-white rounded-2xl p-4 transition-all hover:shadow-md"
      style={{ border: '1px solid #DFE6E9', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)' }}
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
            <h3 className="font-bold truncate" style={{ color: '#2D3436' }}>
              {otherPartyName || 'Anonymous'}
            </h3>
            <Badge 
              className="ml-2 flex-shrink-0 font-bold"
              style={{ background: status.bgColor, color: status.textColor }}
            >
              {status.label}
            </Badge>
          </div>

          <div className="space-y-1 text-sm" style={{ color: '#636E72' }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#FFB347' }} />
              <span>
                {booking.date ? format(new Date(booking.date), 'EEE, MMM d') : 'TBD'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: '#74B9FF' }} />
              <span>{booking.start_time} - {booking.end_time}</span>
            </div>
            {booking.venue_name && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: '#FF6B6B' }} />
                <span className="truncate">{booking.venue_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: '#DFE6E9' }}>
        <span className="text-lg font-extrabold" style={{ color: '#2D3436' }}>
          ₹{isSeeker ? booking.total_amount : booking.base_price}
        </span>
        {booking.status === 'completed' ? (
          <Link
            to={createPageUrl(`LeaveReview?id=${booking.id}`)}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-sm font-bold hover:underline"
            style={{ color: '#FFB347' }}
          >
            <Star className="w-4 h-4" />
            Leave Review
          </Link>
        ) : booking.chat_enabled && (
          <div className="flex items-center gap-1 text-sm" style={{ color: '#4ECDC4' }}>
            <MessageCircle className="w-4 h-4" />
            <span>Chat available</span>
          </div>
        )}
      </div>
    </Link>
  );
}