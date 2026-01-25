import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { formatCurrency } from '../components/utils/formatCurrency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DisputeDetailsDialog from '../components/admin/DisputeDetailsDialog';
import { 
  ArrowLeft, AlertTriangle, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const disputeStatusConfig = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700', icon: XCircle },
};

const reasonLabels = {
  no_show: 'No Show',
  misconduct: 'Misconduct',
  payment_issue: 'Payment Issue',
  safety_concern: 'Safety Concern',
  other: 'Other'
};

const DisputeCard = React.memo(({ dispute, idx, bookingsMap, onOpenDetails }) => {
  const status = disputeStatusConfig[dispute.status];
  const StatusIcon = status.icon;
  const booking = bookingsMap[dispute.booking_id];

  return (
    <div>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn(status.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {reasonLabels[dispute.reason]}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Booking #{dispute.booking_id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Raised: {format(new Date(dispute.created_date), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Raised by</span>
            <span className="font-medium text-slate-900 capitalize">
              {dispute.raised_by_name} ({dispute.raised_by_role})
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Against</span>
            <span className="font-medium text-slate-900">{dispute.against_user_name}</span>
          </div>
          {booking && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Amount</span>
              <span className="font-medium text-slate-900">{formatCurrency(booking.total_amount)}</span>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          className="w-full rounded-xl"
          onClick={() => onOpenDetails(dispute)}
        >
          View Details & Resolve
        </Button>
      </Card>
    </div>
  );
});

export default function AdminDisputes() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: disputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ['all-disputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 50),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const bookingIds = React.useMemo(() => 
    [...new Set(disputes.map(d => d.booking_id))], 
    [disputes]
  );

  const { data: bookingsMap = {}, isLoading: bookingsLoading } = useQuery({
    queryKey: ['disputes-bookings', bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return {};
      
      // Fetch only needed bookings using filter
      const bookings = await Promise.all(
        bookingIds.map(id => 
          base44.entities.Booking.filter({ id }).then(results => results[0]).catch(() => null)
        )
      );
      
      return bookings.reduce((acc, b) => {
        if (b) acc[b.id] = b;
        return acc;
      }, {});
    },
    enabled: bookingIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ dispute, resolution, refund, notes, booking }) => {
      await base44.entities.Dispute.update(dispute.id, {
        status: 'resolved',
        resolution: resolution,
        resolution_notes: notes,
        refund_amount: refund,
        resolved_by: user.id,
        resolved_date: new Date().toISOString()
      });

      if (booking) {
        await base44.entities.Booking.update(dispute.booking_id, {
          status: 'completed',
          escrow_status: refund > 0 ? 'refunded' : 'released'
        });
      }

      await base44.entities.Notification.create({
        user_id: dispute.raised_by,
        type: 'booking_reminder',
        title: '✅ Dispute Resolved',
        message: `Your dispute has been resolved. ${refund > 0 ? `Refund of ${formatCurrency(refund)} processed.` : ''}`,
        booking_id: dispute.booking_id,
        action_url: createPageUrl(`BookingView?id=${dispute.booking_id}`)
      });

      await base44.entities.Notification.create({
        user_id: dispute.against_user_id,
        type: 'booking_reminder',
        title: 'Dispute Resolved',
        message: `The dispute for your booking has been resolved by our team.`,
        booking_id: dispute.booking_id,
        action_url: createPageUrl(`BookingView?id=${dispute.booking_id}`)
      });

      if (refund > 0 && booking) {
        await base44.entities.Notification.create({
          user_id: booking.seeker_id,
          type: 'payment_refunded',
          title: '💰 Refund Processed',
          message: `${formatCurrency(refund)} has been refunded to your account due to dispute resolution`,
          amount: refund
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['disputes-bookings'] });
      setSelectedDispute(null);
    }
  });

  const { openDisputes, reviewDisputes, resolvedDisputes } = React.useMemo(() => ({
    openDisputes: disputes.filter(d => d.status === 'open'),
    reviewDisputes: disputes.filter(d => d.status === 'under_review'),
    resolvedDisputes: disputes.filter(d => d.status === 'resolved')
  }), [disputes]);

  const handleResolve = React.useCallback((dispute, resolution, refund, notes) => {
    const booking = bookingsMap[dispute.booking_id];
    resolveMutation.mutate({ dispute, resolution, refund, notes, booking });
  }, [bookingsMap]);

  const handleCloseDialog = React.useCallback(() => {
    setSelectedDispute(null);
  }, []);

  const handleOpenDispute = React.useCallback((dispute) => {
    // Only open if we have the booking data loaded
    if (bookingsMap[dispute.booking_id] || bookingsLoading) {
      setSelectedDispute(dispute);
    }
  }, [bookingsMap, bookingsLoading]);

  const selectedBooking = React.useMemo(() => 
    selectedDispute ? bookingsMap[selectedDispute.booking_id] || null : null,
    [selectedDispute, bookingsMap]
  );

  const isLoading = disputesLoading || bookingsLoading;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Dispute Management</h1>
            <p className="text-sm text-slate-500">{openDisputes.length} open disputes</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-6xl mx-auto space-y-6">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (
          <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Open</p>
                <p className="text-2xl font-bold text-slate-900">{openDisputes.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Under Review</p>
                <p className="text-2xl font-bold text-slate-900">{reviewDisputes.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Resolved</p>
                <p className="text-2xl font-bold text-slate-900">{resolvedDisputes.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="open">Open ({openDisputes.length})</TabsTrigger>
            <TabsTrigger value="review">Review ({reviewDisputes.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-3 mt-4">
            {openDisputes.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No open disputes</p>
              </Card>
            ) : (
              openDisputes.map((dispute, idx) => (
                <DisputeCard 
                  key={dispute.id} 
                  dispute={dispute} 
                  idx={idx}
                  bookingsMap={bookingsMap}
                  onOpenDetails={handleOpenDispute}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-3 mt-4">
            {reviewDisputes.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No disputes under review</p>
              </Card>
            ) : (
              reviewDisputes.map((dispute, idx) => (
                <DisputeCard 
                  key={dispute.id} 
                  dispute={dispute} 
                  idx={idx}
                  bookingsMap={bookingsMap}
                  onOpenDetails={handleOpenDispute}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-3 mt-4">
            {resolvedDisputes.length === 0 ? (
              <Card className="p-12 text-center">
                <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No resolved disputes yet</p>
              </Card>
            ) : (
              resolvedDisputes.map((dispute, idx) => (
                <DisputeCard 
                  key={dispute.id} 
                  dispute={dispute} 
                  idx={idx}
                  bookingsMap={bookingsMap}
                  onOpenDetails={handleOpenDispute}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>

      {selectedDispute && (
        <DisputeDetailsDialog
        dispute={selectedDispute}
        booking={selectedBooking}
        isOpen={!!selectedDispute}
        onClose={handleCloseDialog}
        onResolve={handleResolve}
        isPending={resolveMutation.isPending}
      />
      )}
    </div>
  );
}