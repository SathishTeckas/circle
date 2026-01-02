import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { MapPin, Clock, Globe, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SafetyBadge from '@/components/ui/SafetyBadge';
import RatingStars from '@/components/ui/RatingStars';
import { cn } from '@/lib/utils';

export default function CompanionCard({ availability, variant = 'default' }) {
  const isCompact = variant === 'compact';
  
  return (
    <Link 
      to={createPageUrl(`BookingDetails?id=${availability.id}`)}
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
          src={availability.companion_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'}
          alt={availability.companion_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <SafetyBadge verified={true} />
        </div>
        {!isCompact && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-lg">
              {availability.companion_name || 'Anonymous'}
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
            {availability.companion_name || 'Anonymous'}
          </h3>
        )}
        
        <div className="flex items-center gap-2 mb-2">
          <RatingStars rating={4.8} size="sm" />
          <span className="text-xs text-slate-500">(24 reviews)</span>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-violet-500" />
            <span>{availability.area}, {availability.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-violet-500" />
            <span>{availability.start_time} - {availability.end_time}</span>
          </div>
          {availability.languages?.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Globe className="w-4 h-4 text-violet-500" />
              <span>{availability.languages.slice(0, 2).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Interests */}
        {!isCompact && availability.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {availability.interests.slice(0, 3).map((interest, idx) => (
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
              ${availability.price_per_hour}
            </span>
            <span className="text-sm text-slate-500">/hour</span>
          </div>
          <div className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
            Book Now
          </div>
        </div>
      </div>
    </Link>
  );
}