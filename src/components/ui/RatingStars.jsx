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
              className={cn(
                sizeClasses[size],
                star <= rating 
                  ? "fill-amber-400 text-amber-400" 
                  : "fill-slate-200 text-slate-200"
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-slate-600 ml-1">
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </span>
      )}
    </div>
  );
}