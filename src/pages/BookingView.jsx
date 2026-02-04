import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatTime12Hour } from '../components/utils/timeFormat';
import { formatCurrency } from '../components/utils/formatCurrency';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Calendar, Clock, MapPin, MessageCircle, 
  CheckCircle, XCircle, AlertCircle, Shield, IndianRupee, Star
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function CompleteMeetingCard({ booking, uploadingSelfie, completeMeetingMutation, handleSelfieUpload }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [canComplete, setCanComplete] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const [hours, minutes] = (booking?.start_time || '00:00').split(':').map(Number);
      const meetupDateTime = new Date(booking?.date || new Date());
      meetupDateTime.setHours(hours, minutes, 0, 0);
      const enableTime = new Date(meetupDateTime.getTime() + 10 * 60 * 1000); // 10 mins after start
      const now = new Date();
      const diff = enableTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCanComplete(true);
        setTimeRemaining(null);
      } else {
        setCanComplete(false);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [booking?.start_time, booking?.date]);

  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
        <CheckCircle className="w-5 h-5" />
        Complete Meeting
      </h3>
      <p className="text-sm text-emerald-700 mb-4">
        Upload a selfie from your meetup to confirm completion and receive payment.
      </p>
      
      {!canComplete && timeRemaining && (
        <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 mb-4 text-center">
          <p className="text-sm text-amber-800 font-medium">
            <Clock className="w-4 h-4 inline mr-1" />
            Available in <span className="font-bold">{timeRemaining}</span>
          </p>
          <p className="text-xs text-amber-600 mt-1">
            You can complete after 10 minutes from meetup start time
          </p>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleSelfieUpload}
        disabled={!canComplete || uploadingSelfie || completeMeetingMutation.isPending}
        className="hidden"
        id="selfie-upload"
      />
      <label htmlFor="selfie-upload">
        <Button 
          asChild
          disabled={!canComplete || uploadingSelfie || completeMeetingMutation.isPending}
          className={cn(
            "w-full h-14 rounded-xl cursor-pointer",
            canComplete 
              ? "bg-emerald-600 hover:bg-emerald-700" 
              : "bg-slate-300 cursor-not-allowed"
          )}
        >
          <span>
            {uploadingSelfie || completeMeetingMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Upload Selfie & Complete
              </>
            )}
          </span>
        </Button>
      </label>
    </Card>
  );
}

const statusConfig = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-blue-100 text-blue-700', icon: Clock },
  pending: { label: 'Pending Response', color: 'bg-amber-100 text-amber-700', icon: Clock },
  accepted: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-violet-100 text-violet-700', icon: CheckCircle },
  no_show_companion: { label: 'Companion No-Show', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  no_show_seeker: { label: 'User No-Show', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  disputed: { label: 'Under Review', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function BookingView() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Check if KYC is required before viewing booking (only for new bookings, not existing ones)
        if (userData.kyc_status !== 'verified' && !bookingId) {
          window.location.href = createPageUrl('KYCVerification');
        }
      } catch (error) {
        console.error('Error loading user in BookingView:', error);
        setUser(null);
      }
    };
    loadUser();
  }, [bookingId]);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const results = await base44.entities.Booking.filter({ id: bookingId });
      return results[0];
    },
    enabled: !!bookingId,
    refetchInterval: 5000
  });

  const { data: appSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.list();
      return settings[0] || { platform_fee: 7 };
    }
  });

  const { data: companionUser } = useQuery({
    queryKey: ['companion-user', booking?.companion_id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserProfile', { userId: booking.companion_id });
      return response.data.user;
    },
    enabled: !!booking?.companion_id
  });

  const { data: seekerUser } = useQuery({
    queryKey: ['seeker-user', booking?.seeker_id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserProfile', { userId: booking.seeker_id });
      return response.data.user;
    },
    enabled: !!booking?.seeker_id
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const companionResponse = await base44.functions.invoke('getUserProfile', { userId: booking.companion_id });
      const companion = companionResponse.data.user;
      
      await base44.entities.Booking.update(bookingId, { 
        status: 'accepted',
        chat_enabled: true
      });
      if (booking?.availability_id) {
        await base44.entities.Availability.update(booking.availability_id, {
          status: 'booked'
        });
      }
      await base44.entities.Notification.create({
        user_id: booking?.seeker_id,
        type: 'booking_accepted',
        title: '🎉 Booking Confirmed!',
        message: `${companion?.display_name || companion?.full_name || booking?.companion_name} accepted your booking request`,
        booking_id: bookingId,
        amount: booking?.total_amount || 0,
        action_url: createPageUrl(`BookingView?id=${bookingId}`)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const companionResponse = await base44.functions.invoke('getUserProfile', { userId: booking.companion_id });
      const companion = companionResponse.data.user;
      
      // Process refund via Cashfree if payment was made
      let refundResult = null;
      console.log('Reject mutation - booking details:', {
        payment_order_id: booking?.payment_order_id,
        payment_status: booking?.payment_status,
        total_amount: booking?.total_amount
      });
      
      if (booking?.payment_order_id && booking?.payment_status === 'paid') {
        console.log('Calling processRefund API...');
        const { data } = await base44.functions.invoke('processRefund', {
          order_id: booking.payment_order_id,
          refund_amount: booking.total_amount,
          refund_reason: 'Booking rejected by companion',
          booking_id: bookingId
        });
        console.log('Refund API response:', data);
        refundResult = data;
      } else {
        console.log('Refund not triggered - conditions not met');
      }
      
      await base44.entities.Booking.update(bookingId, { 
        status: 'rejected',
        escrow_status: 'refunded',
        payment_status: 'refunded',
        refund_id: refundResult?.refund_id,
        refund_amount: booking?.total_amount
      });
      if (booking?.availability_id) {
        await base44.entities.Availability.update(booking.availability_id, { 
          status: 'available'
        });
      }
      await base44.entities.Notification.create({
        user_id: booking?.seeker_id,
        type: 'booking_rejected',
        title: 'Booking Declined',
        message: `${companion?.display_name || companion?.full_name || booking?.companion_name} declined your booking request. Full refund processed.`,
        booking_id: bookingId,
        amount: booking?.total_amount || 0,
        action_url: createPageUrl('Discover')
      });
      await base44.entities.Notification.create({
        user_id: booking?.seeker_id,
        type: 'payment_refunded',
        title: '💰 Refund Processed',
        message: `${formatCurrency(booking?.total_amount || 0)} has been refunded to your account`,
        amount: booking?.total_amount || 0,
        action_url: createPageUrl('MyBookings')
      });
    },
    onSuccess: () => {
      toast.success('Booking rejected and refund initiated');
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to process rejection');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ refundPercentage, refundAmount: passedRefundAmount, fullRefund, companionCancelled }) => {
      // Platform fee is NEVER refunded for accepted bookings
      // But for pending bookings (before acceptance), full refund including platform fee
      const basePrice = booking?.base_price || 0;
      const totalAmount = booking?.total_amount || 0;
      const isSeeker = user?.id === booking?.seeker_id;
      
      // Use passed refundAmount if available, otherwise calculate from percentage
      let refundAmount;
      if (fullRefund) {
        // Full refund (pending booking cancellation) - include platform fee
        refundAmount = totalAmount;
      } else if (companionCancelled) {
        // Companion cancelled - use the passed refundAmount (base_price for 6+ hours, 0 for <3 hours)
        refundAmount = passedRefundAmount !== undefined ? passedRefundAmount : basePrice;
      } else {
        refundAmount = passedRefundAmount !== undefined ? passedRefundAmount : Math.round(basePrice * refundPercentage / 100);
      }
      
      // Companion gets the non-refunded portion of base_price (only for seeker cancelling accepted bookings)
      // For 0% refund (< 3 hours), companion gets the FULL base_price
      let companionCompensation = 0;
      if (!fullRefund && !companionCancelled && isSeeker) {
        // Seeker cancelled an accepted booking - companion gets non-refunded portion
        const actualRefundFromBasePrice = passedRefundAmount !== undefined ? passedRefundAmount : Math.round(basePrice * refundPercentage / 100);
        companionCompensation = Math.round(basePrice - actualRefundFromBasePrice);
      }
      
      // Process refund via Cashfree if payment was made and refund amount > 0
      let refundResult = null;
      if (booking?.payment_order_id && booking?.payment_status === 'paid' && refundAmount > 0) {
        const { data } = await base44.functions.invoke('processRefund', {
          order_id: booking.payment_order_id,
          refund_amount: refundAmount,
          refund_reason: `Booking cancelled (${refundPercentage}% refund)`,
          booking_id: bookingId
        });
        refundResult = data;
      }
      
      await base44.entities.Booking.update(bookingId, { 
        status: 'cancelled',
        escrow_status: refundPercentage > 0 ? 'refunded' : 'held',
        payment_status: refundPercentage > 0 ? 'refunded' : booking?.payment_status,
        refund_id: refundResult?.refund_id,
        refund_amount: refundAmount
      });
      if (booking?.availability_id) {
        await base44.entities.Availability.update(booking.availability_id, { 
          status: 'available'
        });
      }
      const cancellerName = user?.display_name || user?.full_name || (isSeeker ? booking?.seeker_name : booking?.companion_name);
      
      // If seeker cancelled and there's retained amount, split it according to settings
      // retainedAmount = basePrice - refundAmount (what's left from base price after refund)
      if (isSeeker && !fullRefund && !companionCancelled) {
        const retainedAmount = basePrice - refundAmount;

        if (retainedAmount > 0) {
          // Get split percentages from app settings
          const settingsResponse = await base44.entities.AppSettings.list('', 1);
          const settings = settingsResponse[0] || { cancellation_platform_split: 30, cancellation_companion_split: 20 };

          const companionSplitPercent = settings.cancellation_companion_split || 20;

          // Calculate companion's share directly from retained amount (no platform fee deduction)
          companionCompensation = Math.round(retainedAmount * companionSplitPercent / 100);

          const companionResponse = await base44.functions.invoke('getUserProfile', { userId: booking.companion_id });
          const companion = companionResponse.data.user;
          const currentWalletBalance = companion?.wallet_balance || 0;
          const newWalletBalance = currentWalletBalance + companionCompensation;

          await base44.entities.User.update(booking.companion_id, {
            wallet_balance: newWalletBalance
          });

          // Create wallet transaction for companion compensation
          await base44.entities.WalletTransaction.create({
            user_id: booking.companion_id,
            transaction_type: 'booking_earning',
            amount: companionCompensation,
            balance_before: currentWalletBalance,
            balance_after: newWalletBalance,
            reference_id: bookingId,
            reference_type: 'Booking',
            description: `Cancellation compensation (${companionSplitPercent}% of retained ₹${retainedAmount})`,
            status: 'completed'
          });

          // Notify companion about compensation
          await base44.entities.Notification.create({
            user_id: booking?.companion_id,
            type: 'payment_received',
            title: '💰 Cancellation Compensation',
            message: `You received ${formatCurrency(companionCompensation)} (${companionSplitPercent}% of retained amount) as compensation for the cancelled booking`,
            amount: companionCompensation,
            booking_id: bookingId,
            action_url: createPageUrl('Wallet')
          });
        }
      }

      // Notify the OTHER party about cancellation
      if (isSeeker) {
        // Seeker cancelled - notify companion
        await base44.entities.Notification.create({
          user_id: booking?.companion_id,
          type: 'booking_cancelled',
          title: '❌ Booking Cancelled',
          message: `${cancellerName} cancelled their booking with you.${companionCompensation > 0 ? ` You received ${formatCurrency(companionCompensation)} as compensation.` : ''}`,
          booking_id: bookingId,
          action_url: createPageUrl('CalendarView')
        });
      } else {
        // Companion cancelled - notify seeker
        await base44.entities.Notification.create({
          user_id: booking?.seeker_id,
          type: 'booking_cancelled',
          title: '❌ Booking Cancelled',
          message: `${cancellerName} cancelled the booking. Full refund will be processed.`,
          booking_id: bookingId,
          action_url: createPageUrl('CalendarView')
        });
      }

      // Notify the CANCELLING user about their own cancellation (confirmation)
      if (isSeeker) {
        // Seeker cancelled - confirm to seeker
        await base44.entities.Notification.create({
          user_id: booking?.seeker_id,
          type: 'booking_cancelled',
          title: '❌ Booking Cancelled',
          message: `You cancelled your booking with ${booking?.companion_name || 'companion'}.${refundPercentage > 0 ? ` ${refundPercentage}% refund will be processed.` : ''}`,
          booking_id: bookingId,
          action_url: createPageUrl('CalendarView')
        });
      } else {
        // Companion cancelled - confirm to companion
        await base44.entities.Notification.create({
          user_id: booking?.companion_id,
          type: 'booking_cancelled',
          title: '❌ Booking Cancelled',
          message: `You cancelled the booking with ${booking?.seeker_name || 'guest'}. Full refund has been issued to the seeker.`,
          booking_id: bookingId,
          action_url: createPageUrl('CalendarView')
        });
      }

      // Send refund notification to seeker (regardless of who cancelled)
      if (refundPercentage > 0) {
        await base44.entities.Notification.create({
          user_id: booking?.seeker_id,
          type: 'payment_refunded',
          title: '💰 Refund Processed',
          message: `${formatCurrency(refundAmount)} (${refundPercentage}%) has been refunded to your account`,
          amount: refundAmount,
          action_url: createPageUrl('MyBookings')
        });
      }
    },
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel booking');
    }
  });

  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingCancelRefund, setPendingCancelRefund] = useState(null);

  const completeMeetingMutation = useMutation({
    mutationFn: async (selfieFile) => {
      const companionResponse = await base44.functions.invoke('getUserProfile', { userId: booking.companion_id });
      const companion = companionResponse.data.user;
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selfieFile });
      
      await base44.entities.Booking.update(bookingId, { 
        status: 'completed',
        escrow_status: 'released',
        meetup_photo: file_url
      });

      if (booking?.availability_id) {
        await base44.entities.Availability.update(booking.availability_id, { 
          status: 'completed'
        });
      }

      // Update companion's wallet balance
      const companionPayout = booking?.companion_payout || booking?.base_price || 0;
      const currentWalletBalance = companion?.wallet_balance || 0;
      const newWalletBalance = currentWalletBalance + companionPayout;
      
      await base44.entities.User.update(booking.companion_id, {
        wallet_balance: newWalletBalance
      });

      // Create wallet transaction record
      await base44.entities.WalletTransaction.create({
        user_id: booking.companion_id,
        transaction_type: 'booking_earning',
        amount: companionPayout,
        balance_before: currentWalletBalance,
        balance_after: newWalletBalance,
        reference_id: bookingId,
        reference_type: 'Booking',
        description: `Meetup earning from ${booking?.seeker_name || 'guest'}`,
        status: 'completed'
      });

      await base44.entities.Notification.create({
        user_id: booking?.seeker_id,
        type: 'booking_reminder',
        title: '✅ Meeting Completed',
        message: `Your meeting with ${companion?.display_name || companion?.full_name || booking?.companion_name} has been completed. Please leave a review!`,
        booking_id: bookingId,
        action_url: createPageUrl(`LeaveReview?bookingId=${bookingId}`)
      });

      await base44.entities.Notification.create({
        user_id: booking?.companion_id,
        type: 'payout_processed',
        title: '💰 Payment Released',
        message: `${formatCurrency(companionPayout)} has been credited to your wallet`,
        amount: companionPayout,
        action_url: createPageUrl('Wallet')
      });
    },
    onSuccess: () => {
      setUploadingSelfie(false);
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
    onError: () => {
      setUploadingSelfie(false);
    }
  });

  const handleSelfieUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingSelfie(true);
    completeMeetingMutation.mutate(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8F9FA' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2D3436' }}>Booking Not Found</h2>
          <Button onClick={() => window.history.back()} className="font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isCompanion = user?.id === booking.companion_id;
  const isSeeker = user?.id === booking.seeker_id;
  const otherPartyName = isSeeker 
    ? (companionUser?.display_name || booking?.companion_name) 
    : (seekerUser?.display_name || booking?.seeker_name);
  const otherPartyPhoto = isSeeker ? booking?.companion_photo : booking?.seeker_photo;
  const status = statusConfig[booking?.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const calculateRefund = () => {
    if (!booking?.date || !booking?.start_time) return { percentage: 0, amount: 0, message: 'Booking data incomplete - no refund possible' };
    
    const [hours, minutes] = booking.start_time.split(':').map(Number);
    const meetupDateTime = new Date(booking.date);
    meetupDateTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const hoursUntilMeetup = (meetupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Platform fee is NEVER refunded - only base_price is refundable
    const basePrice = booking?.base_price || 0;
    
    // Platform fee is NEVER refunded in any scenario
    if (hoursUntilMeetup >= 24) {
      // 100% of base_price refunded, platform fee NOT refunded
      return { percentage: 100, amount: Math.round(basePrice), message: 'Full base price refund (24+ hours notice)' };
    } else if (hoursUntilMeetup >= 6) {
      // 50% of base_price only, platform fee NOT refunded
      return { percentage: 50, amount: Math.round(basePrice * 0.5), message: '50% of base price refund (6-24 hours notice)' };
    } else if (hoursUntilMeetup >= 3) {
      // 25% of base_price only, platform fee NOT refunded
      return { percentage: 25, amount: Math.round(basePrice * 0.25), message: '25% of base price refund (3-6 hours notice)' };
    } else {
      return { percentage: 0, amount: 0, message: 'No refund (less than 3 hours notice)' };
    }
  };

  const refundInfo = isSeeker && booking.status === 'accepted' ? calculateRefund() : null;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#FFF3B8' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#2D3436' }} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold" style={{ color: '#2D3436' }}>Booking Details</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(status.color)}>
                <StatusIcon className="w-3.5 h-3.5 mr-1" />
                {status.label}
              </Badge>
              <p className="text-xs text-slate-500">ID: {bookingId?.slice(0, 8)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Companion/Seeker Info */}
        {(isSeeker ? companionUser : seekerUser) ? (
          <Link to={createPageUrl(`UserProfile?id=${isSeeker ? booking.companion_id : booking.seeker_id}`)}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <img
                  src={otherPartyPhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'}
                  alt={otherPartyName || 'Profile Picture'}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">
                    {isSeeker ? 'Your Companion' : 'Guest'}
                  </p>
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {otherPartyName || 'Anonymous'}
                  </h3>
                  <p className="text-xs text-violet-600 mt-1">View Profile →</p>
                </div>
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="p-4 bg-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-24 mb-2" />
                <div className="h-5 bg-slate-200 rounded animate-pulse w-32" />
              </div>
            </div>
          </Card>
        )}

        {/* Booking Details */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">Meetup Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="font-medium text-slate-900">
                  {booking?.date ? format(new Date(booking.date), 'EEE, MMM d') : 'TBD'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Time</p>
                <p className="font-medium text-slate-900">
                  {formatTime12Hour(booking?.start_time || '00:00')} - {formatTime12Hour(booking?.end_time || '00:00')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Location</p>
              <p className="font-medium text-slate-900">
                {booking?.venue_name || `${booking?.area || 'N/A'}, ${booking?.city || 'N/A'}`}
              </p>
              {booking?.venue_address && (
                <p className="text-sm text-slate-600">{booking.venue_address}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
            Payment Details
          </h3>
          
          <div className="space-y-2 text-sm">
            {isSeeker ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Base Price ({booking?.duration_hours || 0}h)</span>
                  <span className="text-slate-900">{formatCurrency(booking?.base_price || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Platform Fee ({appSettings?.platform_fee || 15}%)</span>
                  <span className="text-slate-900">{formatCurrency(booking?.platform_fee || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                  <span className="text-slate-900">Total Paid</span>
                  <span className="text-slate-900">{formatCurrency(booking?.total_amount || 0)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-semibold">
                <span className="text-slate-900">Amount</span>
                <span className="text-slate-900">{formatCurrency(booking?.base_price || 0)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl">
            <Shield className="w-4 h-4" />
            <span>
              {booking?.payment_status === 'paid'
                ? (isSeeker 
                    ? 'Payment held in escrow until meetup is complete'
                    : 'Payment will be credited to your wallet after meetup completion')
                : booking?.payment_status === 'refunded'
                ? 'Payment has been refunded'
                : 'Payment pending'
              }
            </span>
          </div>
          
          {booking?.payment_status === 'paid' && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>Payment confirmed via Cashfree</span>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        {booking.status === 'pending' && isCompanion && (
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Respond to Request</h3>
            <p className="text-sm text-slate-600">
              This request will expire on {booking?.request_expires_at ? format(new Date(booking.request_expires_at), 'MMM d, hh:mm a') : 'soon'}. Please accept or decline.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                className="flex-1 h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Decline
              </Button>
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Accept
              </Button>
            </div>
          </Card>
        )}

        {booking.status === 'pending' && isSeeker && (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Waiting for Response</h3>
                <p className="text-sm text-amber-700 mt-1">
                  The companion has until {booking?.request_expires_at ? format(new Date(booking.request_expires_at), 'MMM d, hh:mm a') : 'soon'} to accept or decline your request.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // For pending bookings, full refund including platform fee
                setPendingCancelRefund({ percentage: 100, amount: booking?.total_amount || 0, fullRefund: true });
                setShowCancelDialog(true);
              }}
              disabled={cancelMutation.isPending}
              className="w-full mt-4 h-12 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Cancel Request
            </Button>
          </Card>
        )}

        {booking.status === 'accepted' && isSeeker && refundInfo && (
          <Card className="p-4 border-red-200 bg-red-50">
            <h3 className="font-semibold text-red-900 mb-2">Cancel Booking</h3>
            <div className="bg-white rounded-xl p-3 mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-600">Cancellation Policy</span>
                <span className={cn(
                  "text-sm font-semibold",
                  refundInfo.percentage === 100 ? "text-emerald-600" :
                  refundInfo.percentage >= 50 ? "text-amber-600" :
                  "text-red-600"
                )}>
                  {refundInfo.message}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Refund Amount</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(refundInfo.amount)}
                </span>
              </div>
              {refundInfo.percentage === 100 && (
                <p className="text-xs text-slate-500 mt-1">
                  (Platform fee of {formatCurrency(booking?.platform_fee || 0)} is non-refundable)
                </p>
              )}
            </div>
            <p className="text-sm text-red-700 mb-3">
              {refundInfo.percentage === 0 
                ? "No refund will be issued as it's less than 3 hours until meetup."
                : refundInfo.percentage === 100
                ? "You'll receive a full base price refund. Platform fee is non-refundable."
                : "A partial refund will be processed to your original payment method."}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setPendingCancelRefund({ percentage: refundInfo.percentage, amount: refundInfo.amount });
                setShowCancelDialog(true);
              }}
              disabled={cancelMutation.isPending}
              className="w-full h-12 rounded-xl border-red-300 text-red-700 hover:bg-red-100"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </Card>
        )}

        {booking.status === 'accepted' && isCompanion && (() => {
          // Calculate companion cancellation refund based on time
          const calculateCompanionCancelRefund = () => {
            if (!booking?.date || !booking?.start_time) return { percentage: 0, amount: 0 };
            
            const [hours, minutes] = booking.start_time.split(':').map(Number);
            const meetupDateTime = new Date(booking.date);
            meetupDateTime.setHours(hours, minutes, 0, 0);
            
            const now = new Date();
            const hoursUntilMeetup = (meetupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            const basePrice = booking?.base_price || 0;
            
            // Companion cancellation: seeker ALWAYS gets full base price refund regardless of time
            // Platform fee is never refunded, but seeker shouldn't be penalized for companion's cancellation
            return { percentage: 100, amount: basePrice };
          };
          
          const companionRefundInfo = calculateCompanionCancelRefund();
          
          return (
            <Card className="p-4 border-red-200 bg-red-50">
              <h3 className="font-semibold text-red-900 mb-2">Cancel Booking</h3>
              <p className="text-sm text-red-700 mb-3">
                The seeker will receive a full base price refund ({formatCurrency(companionRefundInfo.amount)}). Platform fee is non-refundable. Cancelling confirmed bookings may affect your reliability score.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingCancelRefund({ percentage: companionRefundInfo.percentage, amount: companionRefundInfo.amount, companionCancelled: true });
                  setShowCancelDialog(true);
                }}
                disabled={cancelMutation.isPending}
                className="w-full h-12 rounded-xl border-red-300 text-red-700 hover:bg-red-100"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </Card>
          );
        })()}

        {/* Complete Meeting - Companion Only */}
        {booking.status === 'accepted' && isCompanion && (
          <CompleteMeetingCard 
            booking={booking}
            uploadingSelfie={uploadingSelfie}
            completeMeetingMutation={completeMeetingMutation}
            handleSelfieUpload={handleSelfieUpload}
          />
        )}

        {/* Meeting Completed */}
        {booking.status === 'completed' && (
          <Card className="p-6 bg-violet-50 border-violet-200">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Meeting Completed</h3>
              <p className="text-sm text-slate-600 mb-4">
               {isCompanion 
                 ? `Payment of ${formatCurrency(booking?.base_price || 0)} has been credited to your wallet`
                 : 'Thank you for using Circle! Please leave a review.'
               }
              </p>
              {isSeeker && (
                <Link to={createPageUrl(`LeaveReview?bookingId=${bookingId}`)}>
                  <Button className="w-full h-12 bg-violet-600 hover:bg-violet-700 rounded-xl">
                    <Star className="w-5 h-5 mr-2" />
                    Leave Review
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Raise Dispute */}
        {['accepted', 'completed'].includes(booking.status) && (
          <Link to={createPageUrl(`RaiseDispute?id=${bookingId}`)} className="block">
            <Button variant="outline" className="w-full h-12 border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl">
              <AlertCircle className="w-5 h-5 mr-2" />
              Raise Dispute
            </Button>
          </Link>
        )}

        {/* Disputed Status */}
        {booking.status === 'disputed' && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Dispute Under Review</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Our support team is reviewing the dispute. You'll be notified once it's resolved.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Open Chat Button */}
        {booking.chat_enabled && !['completed', 'disputed'].includes(booking.status) && (
          <Link to={createPageUrl(`ChatView?id=${bookingId}`)} className="block">
            <Button className="w-full h-14 bg-violet-600 hover:bg-violet-700 rounded-xl">
              <MessageCircle className="w-5 h-5 mr-2" />
              Open Chat
            </Button>
          </Link>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-2xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold" style={{ color: '#2D3436' }}>
              Cancel this booking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm" style={{ color: '#636E72' }}>
              {pendingCancelRefund && typeof pendingCancelRefund === 'object' 
                ? (pendingCancelRefund.fullRefund
                    ? `Are you sure? The seeker will receive a full refund of ${formatCurrency(pendingCancelRefund.amount)}.`
                    : pendingCancelRefund.companionCancelled
                      ? `Are you sure? The seeker will receive ${formatCurrency(pendingCancelRefund.amount)} refund (platform fee not refunded).`
                      : pendingCancelRefund.percentage === 100 
                        ? `Are you sure? You'll receive ${formatCurrency(pendingCancelRefund.amount)} refund (platform fee not refunded).`
                        : `Are you sure? You'll receive ${formatCurrency(pendingCancelRefund.amount)} (${pendingCancelRefund.percentage}% of base price refunded).`)
                : pendingCancelRefund === 100 
                  ? "Are you sure you want to cancel? This action cannot be undone."
                  : `Are you sure you want to cancel? You will receive a ${pendingCancelRefund || 0}% refund.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel 
              className="flex-1 h-12 rounded-xl font-bold"
              style={{ borderColor: '#DFE6E9' }}
            >
              No, Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false);
                const refundData = typeof pendingCancelRefund === 'object' 
                  ? { refundPercentage: pendingCancelRefund.percentage, refundAmount: pendingCancelRefund.amount, fullRefund: pendingCancelRefund.fullRefund, companionCancelled: pendingCancelRefund.companionCancelled }
                  : { refundPercentage: pendingCancelRefund };
                cancelMutation.mutate(refundData);
              }}
              className="flex-1 h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}