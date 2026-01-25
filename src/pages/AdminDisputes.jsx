import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { formatCurrency } from '../components/utils/formatCurrency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, AlertTriangle, Clock, CheckCircle, XCircle,
  User, Calendar, MapPin, IndianRupee, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
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

const DisputeCard = ({ dispute, idx, bookingsMap, selectedDispute, setSelectedDispute, setDialogOpen, onDialogChange, resolutionNotes, refundAmount, onNotesChange, onRefundChange, onResolve, resolveMutation }) => {
  const status = disputeStatusConfig[dispute.status];
  const StatusIcon = status.icon;
  const booking = bookingsMap[dispute.booking_id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
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

        <Dialog open={selectedDispute?.id === dispute.id} onOpenChange={onDialogChange}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full rounded-xl"
              onClick={() => {
                setSelectedDispute(dispute);
                setDialogOpen(true);
              }}
            >
              View Details & Resolve
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dispute Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
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
                      value={resolutionNotes[dispute.id] || ''}
                      onChange={(e) => onNotesChange(dispute.id, e.target.value)}
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
                            onClick={() => onRefundChange(dispute.id, booking.total_amount.toString())}
                            className="text-xs h-7"
                          >
                            Max: {formatCurrency(booking.total_amount)}
                          </Button>
                      )}
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={refundAmount[dispute.id] || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const max = booking?.total_amount || 0;
                        if (value <= max) {
                          onRefundChange(dispute.id, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      className="h-12 rounded-xl"
                      max={booking?.total_amount}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => onResolve(dispute, 'Resolved in favor of companion')}
                      disabled={!resolutionNotes[dispute.id]?.trim() || resolveMutation.isPending}
                      variant="outline"
                      className="flex-1 h-12 rounded-xl"
                    >
                      Favor Companion
                    </Button>
                    <Button
                      onClick={() => onResolve(dispute, 'Resolved in favor of seeker')}
                      disabled={!resolutionNotes[dispute.id]?.trim() || resolveMutation.isPending}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                      Favor Seeker
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </motion.div>
  );
};

export default function AdminDisputes() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [refundAmount, setRefundAmount] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: disputes = [] } = useQuery({
    queryKey: ['all-disputes'],
    queryFn: async () => {
      const disputes = await base44.entities.Dispute.list('-created_date', 100);
      
      // Fetch display names for all users
      const userIds = new Set();
      disputes.forEach(d => {
        userIds.add(d.raised_by);
        userIds.add(d.against_user_id);
      });
      
      const users = await Promise.all(
        Array.from(userIds).map(id => 
          base44.entities.User.filter({ id }).then(r => r[0]).catch(() => null)
        )
      );
      
      const userMap = users.reduce((acc, u) => {
        if (u) acc[u.id] = u.display_name || u.full_name;
        return acc;
      }, {});
      
      // Update disputes with display names
      return disputes.map(d => ({
        ...d,
        raised_by_name: userMap[d.raised_by] || d.raised_by_name,
        against_user_name: userMap[d.against_user_id] || d.against_user_name
      }));
    }
  });

  const { data: bookingsMap = {} } = useQuery({
    queryKey: ['disputes-bookings'],
    queryFn: async () => {
      const bookingIds = [...new Set(disputes.map(d => d.booking_id))];
      const bookings = await Promise.all(
        bookingIds.map(id => 
          base44.entities.Booking.filter({ id }).then(r => r[0])
        )
      );
      return bookings.reduce((acc, b) => ({ ...acc, [b.id]: b }), {});
    },
    enabled: disputes.length > 0
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ dispute, resolution }) => {
      const refund = parseFloat(refundAmount[dispute.id]) || 0;
      
      // Update dispute
      await base44.entities.Dispute.update(dispute.id, {
        status: 'resolved',
        resolution: resolution,
        resolution_notes: resolutionNotes[dispute.id],
        refund_amount: refund,
        resolved_by: user.id,
        resolved_date: new Date().toISOString()
      });

      // Update booking if needed
      const booking = bookingsMap[dispute.booking_id];
      if (booking) {
        await base44.entities.Booking.update(dispute.booking_id, {
          status: 'completed',
          escrow_status: refund > 0 ? 'refunded' : 'released'
        });
      }

      // Notify both parties
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
    onSuccess: (_, { dispute }) => {
      queryClient.invalidateQueries({ queryKey: ['all-disputes'] });
      setSelectedDispute(null);
      setDialogOpen(false);
      setResolutionNotes(prev => {
        const copy = { ...prev };
        delete copy[dispute.id];
        return copy;
      });
      setRefundAmount(prev => {
        const copy = { ...prev };
        delete copy[dispute.id];
        return copy;
      });
    }
  });

  const openDisputes = disputes.filter(d => d.status === 'open');
  const reviewDisputes = disputes.filter(d => d.status === 'under_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');

  const handleResolve = (dispute, resolution) => {
    resolveMutation.mutate({ dispute, resolution });
  };

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
                  selectedDispute={selectedDispute}
                  setSelectedDispute={setSelectedDispute}
                  setDialogOpen={setDialogOpen}
                  onDialogChange={(open) => {
                    if (!open) {
                      setDialogOpen(false);
                      setSelectedDispute(null);
                    }
                  }}
                  resolutionNotes={resolutionNotes}
                  refundAmount={refundAmount}
                  onNotesChange={(disputeId, value) => setResolutionNotes(prev => ({ ...prev, [disputeId]: value }))}
                  onRefundChange={(disputeId, value) => setRefundAmount(prev => ({ ...prev, [disputeId]: value }))}
                  onResolve={handleResolve}
                  resolveMutation={resolveMutation}
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
                  selectedDispute={selectedDispute}
                  setSelectedDispute={setSelectedDispute}
                  setDialogOpen={setDialogOpen}
                  onDialogChange={(open) => {
                    if (!open) {
                      setDialogOpen(false);
                      setSelectedDispute(null);
                    }
                  }}
                  resolutionNotes={resolutionNotes}
                  refundAmount={refundAmount}
                  onNotesChange={(disputeId, value) => setResolutionNotes(prev => ({ ...prev, [disputeId]: value }))}
                  onRefundChange={(disputeId, value) => setRefundAmount(prev => ({ ...prev, [disputeId]: value }))}
                  onResolve={handleResolve}
                  resolveMutation={resolveMutation}
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
                  selectedDispute={selectedDispute}
                  setSelectedDispute={setSelectedDispute}
                  setDialogOpen={setDialogOpen}
                  onDialogChange={(open) => {
                    if (!open) {
                      setDialogOpen(false);
                      setSelectedDispute(null);
                    }
                  }}
                  resolutionNotes={resolutionNotes}
                  refundAmount={refundAmount}
                  onNotesChange={(disputeId, value) => setResolutionNotes(prev => ({ ...prev, [disputeId]: value }))}
                  onRefundChange={(disputeId, value) => setRefundAmount(prev => ({ ...prev, [disputeId]: value }))}
                  onResolve={handleResolve}
                  resolveMutation={resolveMutation}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}