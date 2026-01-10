import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, 
  IndianRupee, TrendingUp, ArrowLeft, CreditCard, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const payoutStatusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function Wallet() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showPayoutSheet, setShowPayoutSheet] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDetails, setPaymentDetails] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    upi_id: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: completedBookings = [] } = useQuery({
    queryKey: ['earnings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'completed',
        escrow_status: 'released'
      }, '-created_date', 50);
    },
    enabled: !!user?.id
  });

  const { data: pendingBookings = [] } = useQuery({
    queryKey: ['pending-earnings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'accepted',
        escrow_status: 'held'
      }, '-created_date', 50);
    },
    enabled: !!user?.id
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['payouts', user?.id],
    queryFn: async () => {
      return await base44.entities.Payout.filter({ 
        companion_id: user.id 
      }, '-created_date', 50);
    },
    enabled: !!user?.id
  });

  const totalWithdrawn = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayouts = payouts
    .filter(p => ['pending', 'approved', 'processing'].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const pendingEarnings = pendingBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const availableBalance = totalEarnings - totalWithdrawn - pendingPayouts;

  const thisMonth = completedBookings.filter(b => {
    const date = new Date(b.created_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const thisMonthEarnings = thisMonth.reduce((sum, b) => sum + (b.companion_payout || 0), 0);

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(payoutAmount);
      
      if (amount > availableBalance) {
        throw new Error('Insufficient balance');
      }

      if (amount < 100) {
        throw new Error('Minimum payout amount is ₹100');
      }

      const details = paymentMethod === 'upi' 
        ? { upi_id: paymentDetails.upi_id }
        : {
            bank_name: paymentDetails.bank_name,
            account_number: paymentDetails.account_number,
            ifsc_code: paymentDetails.ifsc_code,
            account_holder_name: paymentDetails.account_holder_name
          };

      await base44.entities.Payout.create({
        companion_id: user.id,
        companion_name: user.full_name,
        companion_email: user.email,
        amount: amount,
        payment_method: paymentMethod,
        payment_details: details,
        status: 'pending'
      });

      // Create notification for admin
      const admins = await base44.entities.User.filter({ user_role: 'admin' });
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          type: 'payout_processed',
          title: '💰 New Payout Request',
          message: `${user.full_name} requested a payout of ₹${amount.toFixed(2)}`,
          action_url: createPageUrl('AdminPayouts')
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      setShowPayoutSheet(false);
      setPayoutAmount('');
      setPaymentDetails({
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        account_holder_name: '',
        upi_id: ''
      });
    }
  });

  const canRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount < 100 || amount > availableBalance) return false;
    
    if (paymentMethod === 'upi') {
      return paymentDetails.upi_id.trim() !== '';
    } else {
      return paymentDetails.bank_name.trim() !== '' &&
             paymentDetails.account_number.trim() !== '' &&
             paymentDetails.ifsc_code.trim() !== '' &&
             paymentDetails.account_holder_name.trim() !== '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">My Wallet</h1>
          </div>

          {/* Balance Card */}
          <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
            <p className="text-emerald-100 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold mb-1">₹{availableBalance.toFixed(2)}</p>
            <p className="text-emerald-100 text-xs mb-4">
              Pending: ₹{pendingEarnings.toFixed(2)} • In Progress: ₹{pendingPayouts.toFixed(2)}
            </p>
            
            <Sheet open={showPayoutSheet} onOpenChange={setShowPayoutSheet}>
              <SheetTrigger asChild>
                <Button 
                  className="w-full bg-white text-emerald-600 hover:bg-emerald-50"
                  disabled={availableBalance < 100}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Request Payout
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                <SheetHeader className="mb-6">
                  <SheetTitle>Request Payout</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 overflow-y-auto h-[calc(85vh-140px)] pb-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-sm text-emerald-800 font-medium">Available: ₹{availableBalance.toFixed(2)}</p>
                    <p className="text-xs text-emerald-600 mt-1">Minimum payout: ₹100</p>
                  </div>

                  <div>
                    <Label className="mb-2 block">Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="h-12 rounded-xl"
                      max={availableBalance}
                      min={100}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod === 'upi' ? (
                    <div>
                      <Label className="mb-2 block">UPI ID</Label>
                      <Input
                        placeholder="username@upi"
                        value={paymentDetails.upi_id}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="mb-2 block">Account Holder Name</Label>
                        <Input
                          placeholder="Full name as per bank"
                          value={paymentDetails.account_holder_name}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, account_holder_name: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Bank Name</Label>
                        <Input
                          placeholder="e.g., State Bank of India"
                          value={paymentDetails.bank_name}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_name: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Account Number</Label>
                        <Input
                          placeholder="Enter account number"
                          value={paymentDetails.account_number}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">IFSC Code</Label>
                        <Input
                          placeholder="e.g., SBIN0001234"
                          value={paymentDetails.ifsc_code}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, ifsc_code: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => requestPayoutMutation.mutate()}
                    disabled={!canRequestPayout() || requestPayoutMutation.isPending}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    {requestPayoutMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </Card>
        </div>
      </div>

      <div className="px-4 -mt-4 max-w-lg mx-auto space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">This Month</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">₹{thisMonthEarnings.toFixed(0)}</p>
            <p className="text-xs text-slate-500">{thisMonth.length} meetups</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm text-slate-600">All Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">₹{totalEarnings.toFixed(0)}</p>
            <p className="text-xs text-slate-500">{completedBookings.length} total meetups</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Earnings</h3>

              {completedBookings.length === 0 ? (
                <div className="text-center py-8">
                  <WalletIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No earnings yet</p>
                  <p className="text-sm text-slate-500">Complete meetups to start earning</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedBookings.slice(0, 10).map((booking, idx) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
                    >
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{booking.seeker_name}</p>
                        <p className="text-sm text-slate-500">
                          {booking.created_date ? format(new Date(booking.created_date), 'MMM d, yyyy') : 'Recent'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600">+₹{booking.companion_payout?.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{booking.duration_hours}h meetup</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Payout History</h3>

              {payouts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No payout requests yet</p>
                  <p className="text-sm text-slate-500">Request a payout to withdraw your earnings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout, idx) => {
                    const status = payoutStatusConfig[payout.status];
                    const StatusIcon = status.icon;
                    return (
                      <motion.div
                        key={payout.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border border-slate-200 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">₹{payout.amount.toFixed(2)}</p>
                            <p className="text-sm text-slate-500 capitalize">
                              {payout.payment_method.replace('_', ' ')}
                            </p>
                          </div>
                          <Badge className={cn(status.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{format(new Date(payout.created_date), 'MMM d, yyyy')}</span>
                          {payout.processed_date && (
                            <span>Processed: {format(new Date(payout.processed_date), 'MMM d')}</span>
                          )}
                        </div>
                        {payout.rejection_reason && (
                          <p className="text-sm text-red-600 mt-2">Reason: {payout.rejection_reason}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Platform Fee Info */}
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <IndianRupee className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Platform Fee</h4>
              <p className="text-sm text-slate-600 mt-1">
                Circle charges a 15% platform fee on each booking. Your payout shown above is the net amount after fees.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}