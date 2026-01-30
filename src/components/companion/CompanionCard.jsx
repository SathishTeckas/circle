import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-kyc-check'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const [selectedSlot, setSelectedSlot] = React.useState(primaryAvailability);
  
  const handleBookingClick = (e, slotId) => {
    e.preventDefault();
    
    // Check KYC before allowing booking
    if (currentUser && currentUser.kyc_status !== 'verified') {
      navigate(createPageUrl('KYCVerification'));
      return;
    }
    
    navigate(createPageUrl(`BookingDetails?id=${slotId}`));
  };
  
  return (
    <div 
      className={cn(
        "block rounded-2xl overflow-hidden transition-all duration-300",
        isCompact ? "flex" : ""
      )}
      style={{
        background: '#FFFFFF',
        border: '1px solid #DFE6E9',
        boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)'
      }}
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
            <span className="text-xs" style={{ color: '#636E72' }}>
              ({companion.total_reviews || 0} {companion.total_reviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <Badge className="text-xs font-bold" style={{ background: '#4ECDC4', color: '#2D3436' }}>
              New Companion
            </Badge>
          </div>
        )}

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#636E72' }}>
            <MapPin className="w-4 h-4" style={{ color: '#FF6B6B' }} />
            <span>
              {(() => {
                const uniqueAreas = [...new Set(allSlots.map(s => s.area))];
                if (uniqueAreas.includes('Any Area')) {
                  return allSlots[0].city;
                }
                return `${uniqueAreas.join(', ')}, ${allSlots[0].city}`;
              })()}
            </span>
          </div>
          {primaryAvailability.languages?.length > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#636E72' }}>
              <Globe className="w-4 h-4" style={{ color: '#74B9FF' }} />
              <span>
                {primaryAvailability.languages.join(', ')}
                {primaryAvailability.languages.length > 3 && ` +${primaryAvailability.languages.length - 3} more`}
              </span>
            </div>
          )}
        </div>

        {/* Available Time Slots */}
        {allSlots.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold mb-2" style={{ color: '#2D3436' }}>Available Times:</p>
            <div className="flex flex-wrap gap-2">
              {allSlots.slice(0, 4).map((slot, idx) => (
                <div
                  key={slot.id}
                  onClick={(e) => handleBookingClick(e, slot.id)}
                  className="group"
                >
                  <Badge 
                    variant="outline"
                    className="cursor-pointer transition-all text-xs py-1 px-2 font-medium"
                    style={{ borderColor: '#DFE6E9', color: '#2D3436' }}
                  >
                    <Clock className="w-3 h-3 mr-1" style={{ color: '#FFB347' }} />
                    {new Date(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {formatTimeRange12Hour(slot.start_time, slot.end_time)}
                  </Badge>
                </div>
              ))}
              {allSlots.length > 4 && (
                <Badge className="text-xs font-bold" style={{ background: '#DFE6E9', color: '#636E72' }}>
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
                className="text-xs font-bold"
                style={{ background: '#A8A4FF', color: '#FFFFFF' }}
              >
                {interest}
              </Badge>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#DFE6E9' }}>
          <div>
            <span className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>
              ₹{primaryAvailability.price_per_hour}
            </span>
            <span className="text-sm" style={{ color: '#636E72' }}>/hour</span>
          </div>
          <button
            onClick={(e) => handleBookingClick(e, selectedSlot.id)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:transform hover:-translate-y-0.5"
            style={{ background: '#FFD93D', color: '#2D3436', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)' }}
          >
            View Details
          </button>
        </div>

        {/* Compatibility Info */}
        {showCompatibility && compatibilityReason && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: '#FFF3B8', border: '1px solid #FFD93D' }}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E6C235' }} />
              <p className="text-xs font-medium" style={{ color: '#2D3436' }}>{compatibilityReason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}