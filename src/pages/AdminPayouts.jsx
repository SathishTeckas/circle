import React, { useState, useEffect, useTransition } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { formatCurrency } from '../components/utils/formatCurrency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, IndianRupee, 
  ExternalLink, User, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const payoutStatusConfig = {
  pending: { label: 'Pending Review', bgColor: '#FFF3B8', textColor: '#2D3436', icon: Clock },
  approved: { label: 'Approved', bgColor: '#74B9FF', textColor: '#2D3436', icon: CheckCircle },
  processing: { label: 'Processing', bgColor: '#74B9FF', textColor: '#2D3436', icon: Clock },
  completed: { label: 'Completed', bgColor: '#4ECDC4', textColor: '#2D3436', icon: CheckCircle },
  rejected: { label: 'Rejected', bgColor: '#FF6B6B', textColor: '#FFFFFF', icon: XCircle },
};

export default function AdminPayouts() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: payouts = [] } = useQuery({
    queryKey: ['all-payouts'],
    queryFn: async () => {
      return await base44.entities.Payout.list('-created_date', 100);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (payout) => {
      await base44.entities.Payout.update(payout.id, {
        status: 'approved',
        admin_notes: adminNotes,
        processed_by: user.id,
        processed_date: new Date().toISOString()
      });

      // Notify companion
      await base44.entities.Notification.create({
        user_id: payout.companion_id,
        type: 'payout_processed',
        title: '✅ Payout Approved',
        message: `Your payout request of ${formatCurrency(payout.amount)} has been approved and is being processed`,
        amount: payout.amount,
        action_url: createPageUrl('Wallet')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      setSelectedPayout(null);
      setAdminNotes('');
      setDialogOpen(false);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (payout) => {
      await base44.entities.Payout.update(payout.id, {
        status: 'completed',
        processed_date: new Date().toISOString()
      });

      // Notify companion
      await base44.entities.Notification.create({
        user_id: payout.companion_id,
        type: 'payout_processed',
        title: '💰 Payout Completed',
        message: `${formatCurrency(payout.amount)} has been transferred to your account`,
        amount: payout.amount,
        action_url: createPageUrl('Wallet')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      setSelectedPayout(null);
      setDialogOpen(false);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (payout) => {
      if (!rejectionReason.trim()) {
        throw new Error('Rejection reason is required');
      }

      // Fetch current user balance
      const companion = await base44.entities.User.get(payout.companion_id);
      const currentBalance = companion.wallet_balance || 0;
      const refundedBalance = currentBalance + payout.amount;

      // Update payout status
      await base44.entities.Payout.update(payout.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
        processed_by: user.id,
        processed_date: new Date().toISOString()
      });

      // Refund balance to user wallet
      await base44.entities.User.update(payout.companion_id, {
        wallet_balance: refundedBalance
      });

      // Log refund transaction
      await base44.entities.WalletTransaction.create({
        user_id: payout.companion_id,
        transaction_type: 'refund',
        amount: payout.amount,
        balance_before: currentBalance,
        balance_after: refundedBalance,
        reference_id: payout.id,
        reference_type: 'Payout',
        description: `Payout rejection refund: ${rejectionReason}`,
        status: 'completed'
      });

      // Notify companion
      await base44.entities.Notification.create({
        user_id: payout.companion_id,
        type: 'payout_processed',
        title: '❌ Payout Rejected',
        message: `Your payout request of ${formatCurrency(payout.amount)} was rejected. Reason: ${rejectionReason}. Amount refunded to your wallet.`,
        amount: payout.amount,
        action_url: createPageUrl('Wallet')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      setSelectedPayout(null);
      setRejectionReason('');
      setAdminNotes('');
      setDialogOpen(false);
    }
  });

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const approvedPayouts = payouts.filter(p => ['approved', 'processing'].includes(p.status));
  const completedPayouts = payouts.filter(p => p.status === 'completed');
  const rejectedPayouts = payouts.filter(p => p.status === 'rejected');

  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalCompleted = completedPayouts.reduce((sum, p) => sum + p.amount, 0);

  const PayoutCard = ({ payout, idx }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localAdminNotes, setLocalAdminNotes] = useState('');
    const [localRejectionReason, setLocalRejectionReason] = useState('');
    const [, startTransitionLocal] = useTransition();
    const status = payoutStatusConfig[payout.status];
    const StatusIcon = status.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
      >
        <Card className="p-4 hover:shadow-md transition-shadow" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#FFF3B8' }}>
                <User className="w-5 h-5" style={{ color: '#2D3436' }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: '#2D3436' }}>{payout.companion_name}</p>
                <p className="text-sm" style={{ color: '#636E72' }}>{payout.companion_email}</p>
                <p className="text-xs mt-1" style={{ color: '#B2BEC3' }}>
                  Requested: {format(new Date(payout.created_date), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>
            <Badge className="font-bold" style={{ background: status.bgColor, color: status.textColor }}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="rounded-lg p-3 mb-3" style={{ background: '#F8F9FA' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: '#636E72' }}>Amount</span>
              <span className="text-xl font-extrabold" style={{ color: '#2D3436' }}>{formatCurrency(payout.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#636E72' }}>Method</span>
              <span className="capitalize font-bold" style={{ color: '#2D3436' }}>{payout.payment_method.replace('_', ' ')}</span>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full rounded-xl"
              >
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="max-w-md" 
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Payout Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600">Companion</Label>
                  <p className="font-medium text-slate-900">{payout.companion_name}</p>
                  <p className="text-sm text-slate-500">{payout.companion_email}</p>
                </div>

                <div>
                  <Label className="text-slate-600">Amount</Label>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(payout.amount)}</p>
                </div>

                <div>
                  <Label className="text-slate-600">Payment Method</Label>
                  <p className="font-medium text-slate-900 capitalize">{payout.payment_method.replace('_', ' ')}</p>
                </div>

                <div>
                  <Label className="text-slate-600">Payment Details</Label>
                  <div className="bg-slate-50 rounded-lg p-3 mt-1 space-y-1 text-sm">
                    {payout.payment_method === 'upi' ? (
                      <p><span className="text-slate-600">UPI ID:</span> {payout.payment_details.upi_id}</p>
                    ) : (
                      <>
                        <p><span className="text-slate-600">Account Holder:</span> {payout.payment_details.account_holder_name}</p>
                        <p><span className="text-slate-600">Bank:</span> {payout.payment_details.bank_name}</p>
                        <p><span className="text-slate-600">Account:</span> {payout.payment_details.account_number}</p>
                        <p><span className="text-slate-600">IFSC:</span> {payout.payment_details.ifsc_code}</p>
                      </>
                    )}
                  </div>
                </div>

                {payout.admin_notes && (
                  <div>
                    <Label className="text-slate-600">Admin Notes</Label>
                    <p className="text-sm text-slate-700 mt-1">{payout.admin_notes}</p>
                  </div>
                )}

                {payout.rejection_reason && (
                  <div>
                    <Label className="text-slate-600">Rejection Reason</Label>
                    <p className="text-sm text-red-600 mt-1">{payout.rejection_reason}</p>
                  </div>
                )}

                {payout.status === 'pending' && (
                  <>
                    <div>
                       <Label className="mb-2 block">Admin Notes (Optional)</Label>
                       <Textarea
                         placeholder="Add notes about this payout..."
                         value={localAdminNotes}
                         onChange={(e) => {
                           const value = e.target.value;
                           startTransitionLocal(() => {
                             setLocalAdminNotes(value);
                           });
                         }}
                         className="rounded-xl"
                       />
                     </div>

                    <div className="flex gap-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Payout</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                             <div>
                               <Label className="mb-2 block">Rejection Reason</Label>
                               <Textarea
                                 placeholder="Explain why this payout is being rejected..."
                                 value={localRejectionReason}
                                 onChange={(e) => {
                                   const value = e.target.value;
                                   startTransitionLocal(() => {
                                     setLocalRejectionReason(value);
                                   });
                                 }}
                                 className="rounded-xl"
                                 rows={4}
                               />
                            </div>
                            <Button
                              onClick={() => {
                                setAdminNotes(localAdminNotes);
                                setRejectionReason(localRejectionReason);
                                rejectMutation.mutate(payout);
                              }}
                              disabled={!localRejectionReason.trim() || rejectMutation.isPending}
                              className="w-full bg-red-600 hover:bg-red-700 rounded-xl"
                            >
                              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        onClick={() => {
                          setAdminNotes(localAdminNotes);
                          approveMutation.mutate(payout);
                        }}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                      >
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </Button>
                    </div>
                  </>
                )}

                {payout.status === 'approved' && (
                  <Button
                    onClick={() => completeMutation.mutate(payout)}
                    disabled={completeMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    {completeMutation.isPending ? 'Marking Complete...' : 'Mark as Completed'}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 py-4 max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#FFF3B8' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#2D3436' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold" style={{ color: '#2D3436' }}>Payout Management</h1>
            <p className="text-sm" style={{ color: '#636E72' }}>{pendingPayouts.length} pending requests</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#FFF3B8' }}>
                <Clock className="w-5 h-5" style={{ color: '#2D3436' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#636E72' }}>Pending</p>
                <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{formatCurrency(totalPending)}</p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#B2BEC3' }}>{pendingPayouts.length} requests</p>
          </Card>

          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#74B9FF' }}>
                <CreditCard className="w-5 h-5" style={{ color: '#2D3436' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#636E72' }}>Processing</p>
                <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{approvedPayouts.length}</p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#B2BEC3' }}>In progress</p>
          </Card>

          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#4ECDC4' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#2D3436' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#636E72' }}>Completed</p>
                <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{formatCurrency(totalCompleted)}</p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#B2BEC3' }}>{completedPayouts.length} payouts</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending ({pendingPayouts.length})</TabsTrigger>
            <TabsTrigger value="approved">Processing ({approvedPayouts.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingPayouts.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No pending payout requests</p>
              </Card>
            ) : (
              pendingPayouts.map((payout, idx) => (
                <PayoutCard key={payout.id} payout={payout} idx={idx} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3 mt-4">
            {approvedPayouts.length === 0 ? (
              <Card className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No payouts in processing</p>
              </Card>
            ) : (
              approvedPayouts.map((payout, idx) => (
                <PayoutCard key={payout.id} payout={payout} idx={idx} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-4">
            {completedPayouts.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No completed payouts yet</p>
              </Card>
            ) : (
              completedPayouts.map((payout, idx) => (
                <PayoutCard key={payout.id} payout={payout} idx={idx} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3 mt-4">
            {rejectedPayouts.length === 0 ? (
              <Card className="p-12 text-center">
                <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No rejected payouts</p>
              </Card>
            ) : (
              rejectedPayouts.map((payout, idx) => (
                <PayoutCard key={payout.id} payout={payout} idx={idx} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}