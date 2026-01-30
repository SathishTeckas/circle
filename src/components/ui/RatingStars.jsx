import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RatingStars({ rating, size = 'sm', showValue = true, interactive = false, onChange }) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(star)}
            className={cn(
              "transition-transform",
              interactive && "hover:scale-110 cursor-pointer"
            )}
          >
            <Star
              className={sizeClasses[size]}
              style={{
                fill: star <= rating ? '#FFB347' : '#DFE6E9',
                color: star <= rating ? '#FFB347' : '#DFE6E9'
              }}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-sm ml-1" style={{ color: '#636E72' }}>
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </span>
      )}
    </div>
  );
}