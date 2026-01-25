import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, MapPin, IndianRupee, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const reasonLabels = {
  no_show: 'No Show',
  misconduct: 'Misconduct',
  payment_issue: 'Payment Issue',
  safety_concern: 'Safety Concern',
  other: 'Other'
};

export default function DisputeDetailsDialog({ 
  dispute, 
  booking,
  isOpen, 
  onClose, 
  onResolve,
  isPending 
}) {
  const [notes, setNotes] = React.useState('');
  const [refund, setRefund] = React.useState('');
  const [isContentReady, setIsContentReady] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setNotes('');
      setRefund('');
      setIsContentReady(false);
    } else {
      // Defer content rendering to avoid blocking
      const timer = setTimeout(() => setIsContentReady(true), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  if (!dispute) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle>Dispute Details</DialogTitle>
          <DialogDescription className="sr-only">
            View and resolve dispute details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
          {!isContentReady ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-3">
              <Label className="text-slate-600 text-xs">Raised By</Label>
              <p className="font-semibold text-slate-900">{dispute.raised_by_name}</p>
              <Badge variant="outline" className="mt-1 capitalize text-xs">
                {dispute.raised_by_role}
              </Badge>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <Label className="text-slate-600 text-xs">Against</Label>
              <p className="font-semibold text-slate-900">{dispute.against_user_name}</p>
            </div>
          </div>

          {/* Booking Info */}
          {booking && (
            <Card className="p-3 bg-slate-50">
              <Label className="text-slate-600 text-xs mb-2 block">Booking Details</Label>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{booking.date ? format(new Date(booking.date), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{booking.area}, {booking.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold">{formatCurrency(booking.total_amount)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Dispute Info */}
          <div>
            <Label className="text-slate-600">Reason</Label>
            <p className="font-medium text-slate-900 capitalize">{reasonLabels[dispute.reason]}</p>
          </div>

          <div>
            <Label className="text-slate-600">Description</Label>
            <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg">
              {dispute.description}
            </p>
          </div>

          {/* Evidence */}
          {dispute.evidence_urls?.length > 0 && (
            <div>
              <Label className="text-slate-600 mb-2 block">Evidence</Label>
              <div className="grid grid-cols-3 gap-2">
                {dispute.evidence_urls.map((url, idx) => (
                  <a 
                    key={idx} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="relative group"
                  >
                    <img 
                      src={url} 
                      alt={`Evidence ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Section */}
          {dispute.status === 'resolved' ? (
            <>
              <div>
                <Label className="text-slate-600">Resolution</Label>
                <p className="text-sm text-slate-900 mt-1">{dispute.resolution}</p>
              </div>
              {dispute.resolution_notes && (
                <div>
                  <Label className="text-slate-600">Notes</Label>
                  <p className="text-sm text-slate-700 mt-1">{dispute.resolution_notes}</p>
                </div>
              )}
              {dispute.refund_amount > 0 && (
                <div>
                  <Label className="text-slate-600">Refund Issued</Label>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(dispute.refund_amount)}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <Label className="mb-2 block">Resolution Notes</Label>
                <Textarea
                  placeholder="Explain your decision and reasoning..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl"
                  rows={4}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="block">Refund Amount (Optional)</Label>
                  {booking && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRefund(booking.total_amount.toString())}
                      className="text-xs h-7"
                    >
                      Max: {formatCurrency(booking.total_amount)}
                    </Button>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={refund}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const max = booking?.total_amount || 0;
                    if (value <= max) {
                      setRefund(e.target.value);
                    }
                  }}
                  className="h-12 rounded-xl"
                  max={booking?.total_amount}
                />
              </div>
            </>
          )}
          </>
          )}
        </div>

        {/* Action Buttons */}
        {dispute.status !== 'resolved' && isContentReady && (
          <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
            <div className="flex gap-3">
              <Button
                onClick={() => onResolve(dispute, 'Resolved in favor of companion', parseFloat(refund) || 0, notes)}
                disabled={!notes.trim() || isPending}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                Favor Companion
              </Button>
              <Button
                onClick={() => onResolve(dispute, 'Resolved in favor of seeker', parseFloat(refund) || 0, notes)}
                disabled={!notes.trim() || isPending}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Favor Seeker
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}