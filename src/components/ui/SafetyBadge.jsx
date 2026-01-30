import { Shield, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SafetyBadge({ verified = false, className }) {
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
        className
      )}
      style={{
        background: verified ? '#4ECDC4' : '#FFF3B8',
        color: '#2D3436'
      }}
    >
      {verified ? (
        <>
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Verified</span>
        </>
      ) : (
        <>
          <Shield className="w-3.5 h-3.5" />
          <span>Pending</span>
        </>
      )}
    </div>
  );
}