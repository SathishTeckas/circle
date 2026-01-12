import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Calendar, MapPin, IndianRupee, ExternalLink, FileText
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

export default function MyDisputes() {
  const [user, setUser] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: disputes = [] } = useQuery({
    queryKey: ['my-disputes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch disputes raised by user or against user
      const [raisedDisputes, againstDisputes] = await Promise.all([
        base44.entities.Dispute.filter({ raised_by: user.id }, '-created_date', 50),
        base44.entities.Dispute.filter({ against_user_id: user.id }, '-created_date', 50)
      ]);

      // Combine and deduplicate
      const allDisputes = [...raisedDisputes, ...againstDisputes];
      const uniqueDisputes = Array.from(
        new Map(allDisputes.map(d => [d.id, d])).values()
      );

      return uniqueDisputes;
    },
    enabled: !!user
  });

  const { data: bookingsMap = {} } = useQuery({
    queryKey: ['disputes-bookings', disputes],
    queryFn: async () => {
      const bookingIds = [...new Set(disputes.map(d => d.booking_id))];
      const bookings = await Promise.all(
        bookingIds.map(id => 
          base44.entities.Booking.filter({ id }).then(r => r[0]).catch(() => null)
        )
      );
      return bookings.reduce((acc, b) => {
        if (b) acc[b.id] = b;
        return acc;
      }, {});
    },
    enabled: disputes.length > 0
  });

  const openDisputes = disputes.filter(d => ['open', 'under_review'].includes(d.status));
  const resolvedDisputes = disputes.filter(d => ['resolved', 'closed'].includes(d.status));

  const DisputeCard = ({ dispute, idx }) => {
    const status = disputeStatusConfig[dispute.status];
    const StatusIcon = status.icon;
    const booking = bookingsMap[dispute.booking_id];
    const isRaisedByMe = dispute.raised_by === user?.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
      >
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={cn(status.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {reasonLabels[dispute.reason]}
                </Badge>
                {isRaisedByMe ? (
                  <Badge className="bg-violet-100 text-violet-700">You Raised</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">Against You</Badge>
                )}
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
              <span className="text-slate-600">
                {isRaisedByMe ? 'You raised against' : 'Raised by'}
              </span>
              <span className="font-medium text-slate-900">
                {isRaisedByMe ? dispute.against_user_name : dispute.raised_by_name}
              </span>
            </div>
            {booking && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Date</span>
                  <span className="font-medium text-slate-900">
                    {format(new Date(booking.date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Amount</span>
                  <span className="font-medium text-slate-900">₹{booking.total_amount?.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <Dialog open={dialogOpen && selectedDispute?.id === dispute.id} onOpenChange={(open) => {
            if (open) {
              setSelectedDispute(dispute);
              setDialogOpen(true);
            } else {
              setDialogOpen(false);
              setSelectedDispute(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full rounded-xl"
              >
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dispute Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status Banner */}
                <div className={cn(
                  "p-4 rounded-lg",
                  status.color.replace('text', 'border-l-4 border')
                )}>
                  <div className="flex items-start gap-3">
                    <StatusIcon className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-semibold">{status.label}</p>
                      <p className="text-sm mt-1">
                        {dispute.status === 'open' && 'Your dispute is being reviewed by our team.'}
                        {dispute.status === 'under_review' && 'Our team is actively reviewing this dispute.'}
                        {dispute.status === 'resolved' && 'This dispute has been resolved.'}
                        {dispute.status === 'closed' && 'This dispute has been closed.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <Label className="text-slate-600 text-xs">Raised By</Label>
                    <p className="font-semibold text-slate-900">
                      {isRaisedByMe ? 'You' : dispute.raised_by_name}
                    </p>
                    <Badge variant="outline" className="mt-1 capitalize text-xs">
                      {dispute.raised_by_role}
                    </Badge>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <Label className="text-slate-600 text-xs">Against</Label>
                    <p className="font-semibold text-slate-900">
                      {isRaisedByMe ? dispute.against_user_name : 'You'}
                    </p>
                  </div>
                </div>

                {/* Booking Info */}
                {booking && (
                  <Card className="p-3 bg-slate-50">
                    <Label className="text-slate-600 text-xs mb-2 block">Booking Details</Label>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>{format(new Date(booking.date), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{booking.area}, {booking.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold">₹{booking.total_amount?.toFixed(2)}</span>
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
                    <Label className="text-slate-600 mb-2 block">Evidence Submitted</Label>
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

                {/* Resolution */}
                {dispute.status === 'resolved' && (
                  <div className="border-t pt-4">
                    <Label className="text-slate-600 mb-2 block">Resolution</Label>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-slate-900 font-medium mb-2">{dispute.resolution}</p>
                      {dispute.resolution_notes && (
                        <p className="text-sm text-slate-700">{dispute.resolution_notes}</p>
                      )}
                      {dispute.refund_amount > 0 && (
                        <div className="mt-3 pt-3 border-t border-emerald-200">
                          <Label className="text-slate-600 text-xs">Refund Processed</Label>
                          <p className="text-lg font-bold text-emerald-600">₹{dispute.refund_amount.toFixed(2)}</p>
                        </div>
                      )}
                      {dispute.resolved_date && (
                        <p className="text-xs text-slate-500 mt-2">
                          Resolved on {format(new Date(dispute.resolved_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* View Booking */}
                {booking && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => window.location.href = createPageUrl(`BookingView?id=${booking.id}`)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Booking Details
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </motion.div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">My Disputes</h1>
            <p className="text-sm text-slate-500">Track your dispute status</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold text-slate-900">{openDisputes.length}</p>
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

        {/* Empty State */}
        {disputes.length === 0 && (
          <Card className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No disputes found</p>
            <p className="text-sm text-slate-400 mt-1">Any disputes you raise will appear here</p>
          </Card>
        )}

        {/* Tabs */}
        {disputes.length > 0 && (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active ({openDisputes.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedDisputes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-4">
              {openDisputes.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">No active disputes</p>
                </Card>
              ) : (
                openDisputes.map((dispute, idx) => (
                  <DisputeCard key={dispute.id} dispute={dispute} idx={idx} />
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-3 mt-4">
              {resolvedDisputes.length === 0 ? (
                <Card className="p-8 text-center">
                  <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">No resolved disputes</p>
                </Card>
              ) : (
                resolvedDisputes.map((dispute, idx) => (
                  <DisputeCard key={dispute.id} dispute={dispute} idx={idx} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}