import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { formatTimeRange12Hour } from '../utils/timeFormat';
import { MapPin, Clock, Globe, Heart, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SafetyBadge from '@/components/ui/SafetyBadge';
import RatingStars from '@/components/ui/RatingStars';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function CompanionCard({ availability, availabilities, variant = 'default', showCompatibility, compatibilityReason }) {
  const isCompact = variant === 'compact';
  const allSlots = availabilities || [availability];
  const primaryAvailability = availability;

  const { data: companion } = useQuery({
    queryKey: ['companion-user', primaryAvailability.companion_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: primaryAvailability.companion_id });
      return users[0];
    },
    enabled: !!primaryAvailability.companion_id
  });

  const [selectedSlot, setSelectedSlot] = React.useState(primaryAvailability);
  
  return (
    <div 
      className={cn(
        "block bg-white rounded-2xl overflow-hidden transition-all duration-300",
        "border border-slate-100 hover:border-violet-200",
        "hover:shadow-lg hover:shadow-violet-100/50",
        isCompact ? "flex" : ""
      )}
    >
      {/* Photo */}
      <div className={cn(
        "relative overflow-hidden",
        isCompact ? "w-28 h-28 flex-shrink-0" : "aspect-[4/3]"
      )}>
        <img
          src={primaryAvailability.companion_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'}
          alt={primaryAvailability.companion_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <SafetyBadge verified={true} />
        </div>
        {allSlots.length > 1 && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-violet-600 text-white text-xs">
              {allSlots.length} slots
            </Badge>
          </div>
        )}
        {!isCompact && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-lg">
              {companion?.display_name || primaryAvailability.companion_name || 'Anonymous'}
            </h3>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "p-4",
        isCompact && "flex-1 flex flex-col justify-center"
      )}>
        {isCompact && (
          <h3 className="font-semibold text-slate-900 mb-1">
            {companion?.display_name || primaryAvailability.companion_name || 'Anonymous'}
          </h3>
        )}
        
        {companion && (companion.total_reviews > 0 || companion.average_rating) ? (
          <div className="flex items-center gap-2 mb-2">
            <RatingStars rating={companion.average_rating || 0} size="sm" />
            <span className="text-xs text-slate-500">
              ({companion.total_reviews || 0} {companion.total_reviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-violet-50 text-violet-700 text-xs">
              New Companion
            </Badge>
          </div>
        )}

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-violet-500" />
            <span>{primaryAvailability.area}, {primaryAvailability.city}</span>
          </div>
          {primaryAvailability.languages?.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Globe className="w-4 h-4 text-violet-500" />
              <span>{primaryAvailability.languages.slice(0, 2).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Available Time Slots */}
        {allSlots.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-700 mb-2">Available Times:</p>
            <div className="flex flex-wrap gap-2">
              {allSlots.slice(0, 4).map((slot, idx) => (
                <Link 
                  key={slot.id}
                  to={createPageUrl(`BookingDetails?id=${slot.id}`)}
                  onClick={(e) => e.stopPropagation()}
                  className="group"
                >
                  <Badge 
                    variant="outline"
                    className={cn(
                      "cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-all",
                      "text-xs py-1 px-2"
                    )}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {formatTimeRange12Hour(slot.start_time, slot.end_time)}
                  </Badge>
                </Link>
              ))}
              {allSlots.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{allSlots.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Interests */}
        {!isCompact && primaryAvailability.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {primaryAvailability.interests.slice(0, 3).map((interest, idx) => (
              <Badge 
                key={idx} 
                variant="secondary"
                className="bg-violet-50 text-violet-700 text-xs"
              >
                {interest}
              </Badge>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-2xl font-bold text-slate-900">
              ₹{primaryAvailability.price_per_hour}
            </span>
            <span className="text-sm text-slate-500">/hour</span>
          </div>
          <Link 
            to={createPageUrl(`BookingDetails?id=${selectedSlot.id}`)}
            className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            View Details
          </Link>
        </div>

        {/* Compatibility Info */}
        {showCompatibility && compatibilityReason && (
          <div className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700">{compatibilityReason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}