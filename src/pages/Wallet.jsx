import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { formatCurrency } from '../components/utils/formatCurrency';
import { Link } from 'react-router-dom';
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
  IndianRupee, TrendingUp, ArrowLeft, CreditCard, Clock, CheckCircle, XCircle, PartyPopper
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    upi_id: ''
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showMeetupRequiredDialog, setShowMeetupRequiredDialog] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Load saved payment details if available
      if (userData.saved_payment_method) {
        setPaymentMethod(userData.saved_payment_method);
      }
      if (userData.saved_payment_details) {
        setPaymentDetails(userData.saved_payment_details);
      }
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
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000
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
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000
  });

  const { data: payouts = [] } = useQuery({
   queryKey: ['payouts', user?.id],
   queryFn: async () => {
     return await base44.entities.Payout.filter({ 
       companion_id: user.id 
     }, '-created_date', 100);
   },
   enabled: !!user?.id,
   staleTime: 2 * 60 * 1000
  });

  const { data: systemRewardAmount = 100 } = useQuery({
    queryKey: ['system-reward-amount'],
    queryFn: async () => {
      const systemCampaign = await base44.entities.CampaignReferral.filter({ code: 'SYSTEM' });
      return systemCampaign[0]?.referral_reward_amount || 100;
    },
    staleTime: 10 * 60 * 1000
  });

  const { data: referralsAsReferrer = [] } = useQuery({
   queryKey: ['referrals-as-referrer', user?.id, systemRewardAmount],
   queryFn: async () => {
     const allReferrals = await base44.entities.Referral.filter({
       referrer_id: user.id,
       referral_type: 'user_referral'
     }, '-created_date', 100);

     return allReferrals
       .filter(r => ['completed', 'rewarded'].includes(r.status))
       .map(r => ({ ...r, reward_amount: systemRewardAmount, display_name: r.referee_name, referral_role: 'referrer' }));
   },
   enabled: !!user?.id,
   staleTime: 5 * 60 * 1000
  });

  const { data: referralsAsReferee = [] } = useQuery({
   queryKey: ['referrals-as-referee', user?.id, systemRewardAmount],
   queryFn: async () => {
     const allReferrals = await base44.entities.Referral.filter({
       referee_id: user.id,
       referral_type: 'user_referral'
     }, '-created_date', 100);

     return allReferrals
       .filter(r => ['completed', 'rewarded'].includes(r.status))
       .map(r => ({ ...r, reward_amount: systemRewardAmount, display_name: r.referrer_name, referral_role: 'referee' }));
   },
   enabled: !!user?.id,
   staleTime: 5 * 60 * 1000
  });

  const referrals = [...referralsAsReferrer, ...referralsAsReferee];

  const { data: campaignBonuses = [] } = useQuery({
   queryKey: ['campaign-bonuses', user?.id],
   queryFn: async () => {
     return await base44.entities.WalletTransaction.filter({
       user_id: user.id,
       transaction_type: 'campaign_bonus'
     }, '-created_date', 100);
   },
   enabled: !!user?.id,
   staleTime: 5 * 60 * 1000
  });

  // Use requested_amount (full amount before fee) for balance calculations
  // Fall back to amount for legacy payouts that don't have requested_amount
  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);

  const approvedPayouts = payouts
    .filter(p => ['approved', 'processing'].includes(p.status))
    .reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);

  const hasPendingPayout = payouts.some(p => ['pending', 'approved', 'processing'].includes(p.status));

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const pendingEarnings = pendingBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const referralEarnings = referrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0);
  const campaignEarnings = campaignBonuses.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Calculate total withdrawn from completed payouts (use requested_amount - full amount before fee)
  const totalWithdrawn = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);
  
  // Calculate available balance from actual data sources (NOT wallet_balance which may be stale)
  // Available = Total Earnings + Referral Bonuses + Campaign Bonuses - Withdrawn - Pending Payouts - Approved Payouts
  const calculatedBalance = totalEarnings + referralEarnings + campaignEarnings - totalWithdrawn;
  const availableBalance = Math.max(0, calculatedBalance - pendingPayouts - approvedPayouts);

  // Create unified transaction statement
  const allTransactions = [
    ...completedBookings.map(b => ({
      id: b.id,
      type: 'earning',
      amount: b.companion_payout || 0,
      description: `Meetup with ${b.seeker_name}`,
      date: b.created_date,
      icon: ArrowDownLeft,
      color: 'emerald'
    })),
    ...referrals.map(r => ({
      id: r.id,
      type: 'referral',
      amount: r.reward_amount || 0,
      description: r.referral_role === 'referrer' 
        ? `Referral bonus - You referred ${r.display_name || r.referee_name || 'a user'}`
        : `Welcome bonus - Used code from ${r.display_name || r.referrer_name || 'a user'}`,
      date: r.rewarded_date || r.created_date,
      icon: ArrowDownLeft,
      color: 'violet'
    })),
    ...campaignBonuses.map(c => ({
      id: c.id,
      type: 'campaign',
      amount: c.amount || 0,
      description: c.description || 'Campaign signup bonus',
      date: c.created_date,
      icon: ArrowDownLeft,
      color: 'blue'
    })),
    ...payouts.filter(p => p.status === 'completed').map(p => ({
      id: p.id,
      type: 'payout',
      amount: -p.amount,
      description: `Payout via ${p.payment_method.replace('_', ' ')}`,
      date: p.processed_date || p.created_date,
      icon: ArrowUpRight,
      color: 'red'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const thisMonth = completedBookings.filter(b => {
    const date = new Date(b.created_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const thisMonthEarnings = thisMonth.reduce((sum, b) => sum + (b.base_price || 0), 0);

  // Fetch platform fee globally
  const platformFeeQuery = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const settingsList = await base44.entities.AppSettings.list();
      return (settingsList && settingsList[0]?.platform_fee) || 15;
    },
    staleTime: 30 * 60 * 1000
  });

  const platformFeePercent = platformFeeQuery.data || 15;

  const submitPayout = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }
    
    try {
      const amount = parseFloat(payoutAmount);
      if (!amount || isNaN(amount) || amount < 100) {
        toast.error('Amount must be at least ₹100');
        return;
      }
      if (amount > availableBalance) {
        toast.error('Amount exceeds available balance');
        return;
      }
      
      // Set submitting immediately to prevent double-clicks
      setIsSubmitting(true);
      
      // Check if user only has referral/campaign bonuses but no completed meetups
      if (completedBookings.length === 0 && (referralEarnings > 0 || campaignEarnings > 0)) {
        setShowMeetupRequiredDialog(true);
        return;
      }
      
      if (paymentMethod === 'upi' && !paymentDetails.upi_id?.trim()) {
        toast.error('Please enter UPI ID');
        return;
      }
      if (paymentMethod === 'bank_transfer' && (!paymentDetails.bank_name?.trim() || !paymentDetails.account_number?.trim() || !paymentDetails.ifsc_code?.trim() || !paymentDetails.account_holder_name?.trim())) {
        toast.error('Please fill all bank details');
        return;
      }

      setIsSubmitting(true);
      toast.loading('Submitting payout request...');
      
      const fee = Math.round((amount * platformFeePercent) / 100);
      const netAmount = amount - fee;

      const details = paymentMethod === 'upi' 
        ? { upi_id: paymentDetails.upi_id }
        : {
            bank_name: paymentDetails.bank_name,
            account_number: paymentDetails.account_number,
            ifsc_code: paymentDetails.ifsc_code,
            account_holder_name: paymentDetails.account_holder_name
          };

      const reference_number = `PAY-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      await base44.auth.updateMe({
        saved_payment_method: paymentMethod,
        saved_payment_details: details
      });

      await base44.entities.Payout.create({
        companion_id: user.id,
        companion_name: user.full_name,
        companion_email: user.email,
        requested_amount: amount,
        platform_fee: fee,
        amount: netAmount,
        payment_method: paymentMethod,
        payment_details: details,
        status: 'pending',
        reference_number: reference_number
      });

      const admins = await base44.entities.User.filter({ user_role: 'admin' }, '-created_date', 50);
      if (admins?.length > 0) {
        for (const admin of admins) {
          await base44.entities.Notification.create({
            user_id: admin.id,
            type: 'payout_processed',
            title: '💰 New Payout Request',
            message: `${user.full_name} requested a payout of ${formatCurrency(netAmount)} (after ${platformFeePercent}% platform fee)`,
            action_url: createPageUrl('AdminPayouts')
          });
        }
      }

      toast.dismiss();
      toast.success('Payout request submitted!');
      
      // Reset form state
      setPayoutAmount('');
      setIsSubmitting(false);
      
      // Close sheet and show success dialog
      setShowPayoutSheet(false);
      
      // Small delay to ensure sheet closes before showing dialog
      setTimeout(() => {
        setShowSuccessDialog(true);
      }, 300);
      
      // Refetch data in background
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-earnings'] });
    } catch (error) {
      console.error('Payout error:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to submit payout');
      setIsSubmitting(false);
    }
  };

  const handleOpenPayoutSheet = async () => {
    if (isSubmitting || checkingBalance) return; // Removed requestPayoutMutation.isPending

    setCheckingBalance(true);

    try {
      // Fetch latest data to verify real balance
      const [latestPayouts, latestEarnings, latestPendingBookings, latestReferrals, latestCampaignBonuses, settingsList] = await Promise.all([ // Renamed latestPendingEarnings to latestPendingBookings for clarity
        base44.entities.Payout.filter({ companion_id: user.id }, '-created_date', 200),
        base44.entities.Booking.filter({ 
          companion_id: user.id, 
          status: 'completed',
          escrow_status: 'released'
        }, '-created_date', 100),
        base44.entities.Booking.filter({ // Added latestPendingBookings
          companion_id: user.id, 
          status: 'accepted',
          escrow_status: 'held'
        }, '-created_date', 50),
        base44.entities.Referral.filter({
          referrer_id: user.id,
          referral_type: 'user_referral'
        }, '-created_date', 100),
        base44.entities.WalletTransaction.filter({
          user_id: user.id,
          transaction_type: 'campaign_bonus'
        }, '-created_date', 100),
        base44.entities.AppSettings.list()
      ]);

      const platformFeePercent = (settingsList && settingsList[0]?.platform_fee) || 15;
      
      const latestTotalEarnings = latestEarnings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);

      const systemCampaign = await base44.entities.CampaignReferral.filter({ code: 'SYSTEM' });
      const rewardAmount = systemCampaign[0]?.referral_reward_amount || 100;
      const latestReferralEarnings = latestReferrals
        .filter(r => ['completed', 'rewarded'].includes(r.status))
        .reduce((sum, r) => sum + rewardAmount, 0);

      const latestCampaignEarnings = latestCampaignBonuses.reduce((sum, t) => sum + (t.amount || 0), 0);

      const latestWithdrawn = latestPayouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);
      const latestApproved = latestPayouts.filter(p => ['approved', 'processing'].includes(p.status)).reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);
      const latestPending = latestPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);

      const realBalance = latestTotalEarnings + latestReferralEarnings + latestCampaignEarnings - latestWithdrawn - latestApproved - latestPending;

      if (realBalance < 100) {
        toast.error('Insufficient balance. Minimum balance required: ₹100');
        setCheckingBalance(false);
        return;
      }

      setPayoutAmount('');
      setShowPayoutSheet(true);
    } catch (error) {
      console.error("Error during balance check:", error);
      toast.error('Failed to verify balance. Please try again.');
    } finally {
      setCheckingBalance(false);
    }
  };

  const canRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || isNaN(amount) || amount < 100 || amount > availableBalance) return false;

    if (paymentMethod === 'upi') {
      return paymentDetails.upi_id && paymentDetails.upi_id.trim().length > 0;
    } else {
      return paymentDetails.bank_name && paymentDetails.bank_name.trim().length > 0 &&
             paymentDetails.account_number && paymentDetails.account_number.trim().length > 0 &&
             paymentDetails.ifsc_code && paymentDetails.ifsc_code.trim().length > 0 &&
             paymentDetails.account_holder_name && paymentDetails.account_holder_name.trim().length > 0;
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Meetup Required Dialog */}
      <AlertDialog open={showMeetupRequiredDialog} onOpenChange={setShowMeetupRequiredDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">Complete a Meetup First!</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              At least one meetup should be completed before you can withdraw your referral or campaign bonuses. Start accepting bookings to unlock your earnings!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              onClick={() => setShowMeetupRequiredDialog(false)}
              className="w-full"
              style={{ background: '#FFD93D', color: '#2D3436' }}
            >
              Got it!
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-xl">Congratulations! 🎉</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Your payout request has been submitted successfully! We'll process it shortly and notify you once it's completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                window.location.reload();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Got it!
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="px-4 pt-8 pb-12" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #74B9FF 100%)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.3)' }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-extrabold text-white">My Wallet</h1>
          </div>

          {/* Balance Card */}
          <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
            <p className="text-emerald-100 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold mb-1">{formatCurrency(availableBalance)}</p>
            <p className="text-emerald-100 text-xs mb-1">
              Pending Earnings: {formatCurrency(pendingEarnings)} • Requested Payouts: {formatCurrency(pendingPayouts + approvedPayouts)}
            </p>
            <p className="text-emerald-100/80 text-[10px] mb-4">
              Minimum withdrawal: ₹100
            </p>
            
            <Button 
              onClick={handleOpenPayoutSheet}
              className="w-full bg-white text-emerald-600 hover:bg-emerald-50"
              disabled={availableBalance < 100 || isSubmitting || checkingBalance}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {checkingBalance ? 'Checking Balance...' : isSubmitting ? 'Processing...' : 'Request Payout'}
            </Button>
          </Card>
        </div>
      </div>

      {/* Payout Sheet - moved outside of Card for proper closing */}
      <Sheet open={showPayoutSheet} onOpenChange={setShowPayoutSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Request Payout</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 overflow-y-auto h-[calc(85vh-140px)] pb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
             <p className="text-sm text-emerald-800 font-medium">Available: {formatCurrency(availableBalance)}</p>
             <p className="text-xs text-emerald-600 mt-1">Platform fee {platformFeePercent}% will be deducted from payout amount</p>
             <p className="text-xs text-emerald-600 mt-1">After fees, you'll receive minimum ₹100</p>
             {payoutAmount && !isNaN(parseFloat(payoutAmount)) && (
               <p className="text-xs font-semibold text-red-600 mt-2">
                 You'll receive: {formatCurrency(Math.max(0, parseFloat(payoutAmount) - Math.round((parseFloat(payoutAmount) * platformFeePercent) / 100)))}
               </p>
             )}
            </div>

            <div>
              <Label className="mb-2 block">Amount (₹)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={payoutAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes('.')) {
                      const [whole, decimal] = value.split('.');
                      setPayoutAmount(decimal.length > 2 ? `${whole}.${decimal.slice(0, 2)}` : value);
                    } else {
                      setPayoutAmount(value);
                    }
                  }}
                  className="h-12 rounded-xl flex-1"
                  max={availableBalance}
                  min={100}
                  step="0.01"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayoutAmount(availableBalance.toString())}
                  className="h-12 rounded-xl px-6"
                >
                  Max
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Payment Method</Label>
                {user?.saved_payment_method && (
                  <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
                )}
              </div>
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
              onClick={submitPayout}
              disabled={isSubmitting || !canRequestPayout()}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(thisMonthEarnings)}</p>
            <p className="text-xs text-slate-500">{thisMonth.length} meetups</p>
            </Card>

            <Card className="p-4">
             <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                 <IndianRupee className="w-4 h-4 text-violet-600" />
               </div>
               <span className="text-sm text-slate-600">All Time</span>
             </div>
             <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalEarnings)}</p>
            <p className="text-xs text-slate-500">{completedBookings.length} total meetups</p>
          </Card>
        </div>

        {/* Balance Breakdown */}
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Balance Breakdown</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Booking Earnings</span>
              <span className="font-medium text-emerald-600">+{formatCurrency(totalEarnings)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Referral Bonuses</span>
              <span className="font-medium text-violet-600">+{formatCurrency(referralEarnings)}</span>
            </div>
            {campaignEarnings > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Campaign Bonuses</span>
                <span className="font-medium text-blue-600">+{formatCurrency(campaignEarnings)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Earnings</span>
              <span className="font-medium text-emerald-600">+{formatCurrency(totalEarnings + referralEarnings + campaignEarnings)}</span>
            </div>
            {totalWithdrawn > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total Withdrawn</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalWithdrawn)}</span>
              </div>
            )}
            {approvedPayouts > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Approved Payouts</span>
                <span className="font-medium text-blue-600">-{formatCurrency(approvedPayouts)}</span>
              </div>
            )}
            {pendingPayouts > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Pending Review</span>
                <span className="font-medium text-amber-600">-{formatCurrency(pendingPayouts)}</span>
              </div>
            )}
            <div className="border-t border-slate-300 pt-2 mt-2 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Available Balance</span>
              <span className="font-bold text-emerald-600 text-lg">{formatCurrency(availableBalance)}</span>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="statement" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="statement">Statement</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="statement" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Transaction History</h3>

              {allTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <WalletIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allTransactions.map((transaction, idx) => {
                    const Icon = transaction.icon;
                    return (
                      <motion.div
                        key={`${transaction.type}-${transaction.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          transaction.color === 'emerald' && "bg-emerald-100",
                          transaction.color === 'violet' && "bg-violet-100",
                          transaction.color === 'blue' && "bg-blue-100",
                          transaction.color === 'red' && "bg-red-100"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            transaction.color === 'emerald' && "text-emerald-600",
                            transaction.color === 'violet' && "text-violet-600",
                            transaction.color === 'blue' && "text-blue-600",
                            transaction.color === 'red' && "text-red-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          {transaction.type === 'earning' ? (
                            <Link 
                              to={createPageUrl(`BookingView?id=${transaction.id}`)}
                              className="font-medium text-violet-600 hover:underline"
                            >
                              {transaction.description}
                            </Link>
                          ) : (
                            <p className="font-medium text-slate-900">{transaction.description}</p>
                          )}
                          <p className="text-sm text-slate-500">
                            {transaction.date ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Recent'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-semibold",
                            transaction.amount > 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {transaction.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

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
                       <p className="font-semibold text-emerald-600">+{formatCurrency(booking.companion_payout || 0)}</p>
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
                    const requestedAmt = payout.requested_amount || payout.amount;
                    const feeAmt = payout.platform_fee || 0;
                    const netAmt = payout.amount;
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
                            <p className="font-semibold text-slate-900">{formatCurrency(netAmt)}</p>
                            {feeAmt > 0 && (
                              <p className="text-xs text-slate-500">
                                Requested: {formatCurrency(requestedAmt)} • Fee: {formatCurrency(feeAmt)}
                              </p>
                            )}
                            <p className="text-sm text-slate-500 capitalize">
                              {payout.payment_method.replace('_', ' ')}
                            </p>
                            {payout.reference_number && (
                              <p className="text-xs text-slate-400 mt-1 font-mono">
                                #{payout.reference_number}
                              </p>
                            )}
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
                Circle charges a platform fee on each booking. Your payout shown above is the net amount after fees.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}