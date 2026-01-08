import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { formatTime12Hour } from '../components/utils/timeFormat';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, MapPin, Clock, Calendar, Globe, Heart, Shield, Star, 
  MessageCircle, ChevronRight, AlertCircle, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import SafetyBadge from '@/components/ui/SafetyBadge';
import RatingStars from '@/components/ui/RatingStars';
import PhotoCarousel from '@/components/profile/PhotoCarousel';
import { cn } from '@/lib/utils';

export default function BookingDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const availabilityId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [selectedHours, setSelectedHours] = useState(1);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: availability, isLoading } = useQuery({
    queryKey: ['availability', availabilityId],
    queryFn: async () => {
      const results = await base44.entities.Availability.filter({ id: availabilityId });
      return results[0];
    },
    enabled: !!availabilityId
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', availability?.companion_id],
    queryFn: async () => {
      return await base44.entities.Review.filter({ reviewee_id: availability.companion_id }, '-created_date', 10);
    },
    enabled: !!availability?.companion_id
  });

  const { data: companionUser } = useQuery({
    queryKey: ['companion-user', availability?.companion_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: availability.companion_id });
      return users[0];
    },
    enabled: !!availability?.companion_id
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const basePrice = availability.price_per_hour * selectedHours;
      const platformFee = basePrice * 0.15;
      const totalAmount = basePrice + platformFee;
      
      const booking = await base44.entities.Booking.create({
        availability_id: availabilityId,
        companion_id: availability.companion_id,
        companion_name: availability.companion_name,
        companion_photo: availability.companion_photo,
        seeker_id: user.id,
        seeker_name: user.full_name,
        seeker_photo: user.profile_photos?.[0],
        date: availability.date,
        start_time: availability.start_time,
        end_time: availability.end_time,
        duration_hours: selectedHours,
        area: availability.area,
        city: availability.city,
        base_price: basePrice,
        platform_fee: platformFee,
        total_amount: totalAmount,
        companion_payout: basePrice,
        status: 'pending',
        escrow_status: 'held',
        request_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });
      
      await base44.entities.Availability.update(availabilityId, { status: 'pending' });
      
      return booking;
    },
    onSuccess: (booking) => {
      window.location.href = createPageUrl(`BookingView?id=${booking.id}`);
    }
  });

  const handleBook = () => {
    setBooking(true);
    bookingMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Not Found</h2>
          <p className="text-slate-600 mb-4">This availability doesn't exist</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const basePrice = availability.price_per_hour * selectedHours;
  const platformFee = basePrice * 0.15;
  const totalAmount = basePrice + platformFee;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header - Photo Carousel */}
      <div className="relative bg-black">
        <div className="max-w-lg mx-auto">
          {companionUser?.profile_photos?.length > 0 ? (
            <div className="relative" style={{ height: '500px' }}>
              <PhotoCarousel 
                photos={companionUser.profile_photos} 
                userName={availability.companion_name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              
              {/* Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {availability.companion_name || 'Anonymous'}
                </h1>
                <div className="flex items-center gap-3">
                  <RatingStars rating={4.8} />
                  <span className="text-white/80 text-sm">({reviews.length} reviews)</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '500px' }}>
              <img
                src={availability.companion_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800'}
                alt={availability.companion_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {availability.companion_name || 'Anonymous'}
                </h1>
                <div className="flex items-center gap-3">
                  <RatingStars rating={4.8} />
                  <span className="text-white/80 text-sm">({reviews.length} reviews)</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg z-10"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        
        {/* Safety Badge */}
        <div className="absolute top-4 right-4 z-10">
          <SafetyBadge verified={true} />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Quick Info */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="font-medium text-slate-900">
                  {format(new Date(availability.date), 'EEE, MMM d')}
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
                  {formatTime12Hour(availability.start_time)} - {formatTime12Hour(availability.end_time)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Location</p>
                <p className="font-medium text-slate-900">
                  {availability.area}, {availability.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Languages</p>
                <p className="font-medium text-slate-900">
                  {availability.languages?.slice(0, 2).join(', ') || 'English'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Interests */}
        {availability.interests?.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {availability.interests.map((interest, idx) => (
                <Badge key={idx} variant="secondary" className="bg-slate-100">
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Safety Info */}
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-900 mb-1">Safety Guaranteed</h3>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  KYC verified profile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Public venue meetups only
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Secure escrow payment
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Reviews
              </h3>
              <span className="text-sm text-slate-500">{reviews.length} reviews</span>
            </div>
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <RatingStars rating={review.rating} size="sm" showValue={false} />
                    <span className="text-sm text-slate-500">{review.reviewer_name}</span>
                  </div>
                  <p className="text-sm text-slate-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Duration Selection */}
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Select Duration</h3>
          <Select value={String(selectedHours)} onValueChange={(v) => setSelectedHours(Number(v))}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map(h => (
                <SelectItem key={h} value={String(h)}>
                  {h} hour{h > 1 ? 's' : ''} - ${availability.price_per_hour * h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</p>
              <p className="text-xs text-slate-500">incl. 15% platform fee</p>
            </div>
            <Button
              onClick={handleBook}
              disabled={booking || bookingMutation.isPending}
              className="h-14 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-xl"
            >
              {bookingMutation.isPending ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Book Now'
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Payment will be held in escrow until meetup is complete
          </p>
        </div>
      </div>
    </div>
  );
}