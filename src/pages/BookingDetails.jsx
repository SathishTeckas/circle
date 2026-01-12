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
  MessageCircle, ChevronRight, AlertCircle, CheckCircle, CalendarDays
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
  const [selectedStartTime, setSelectedStartTime] = useState(null);
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

  const { data: appSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.list();
      return settings[0] || { platform_fee: 15 };
    }
  });

  const { data: companionAvailabilities = [] } = useQuery({
    queryKey: ['companion-availabilities', availability?.companion_id],
    queryFn: async () => {
      return await base44.entities.Availability.filter({ 
        companion_id: availability.companion_id,
        status: 'available'
      }, 'date');
    },
    enabled: !!availability?.companion_id
  });

  // Calculate available start times (hourly slots within availability window)
  const availableStartTimes = React.useMemo(() => {
    if (!availability?.start_time || !availability?.end_time) return [];
    
    const [startHour, startMinute] = availability.start_time.split(':').map(Number);
    const [endHour] = availability.end_time.split(':').map(Number);
    
    const times = [];
    for (let hour = startHour; hour < endHour; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`);
    }
    return times;
  }, [availability]);

  // Calculate max hours available for selected start time
  const maxHoursAvailable = React.useMemo(() => {
    if (!selectedStartTime || !availability?.end_time) return 4;
    
    const [startHour] = selectedStartTime.split(':').map(Number);
    const [endHour] = availability.end_time.split(':').map(Number);
    
    return Math.min(endHour - startHour, 4);
  }, [selectedStartTime, availability]);

  // Initialize selected start time to availability start
  React.useEffect(() => {
    if (availability?.start_time && !selectedStartTime) {
      setSelectedStartTime(availability.start_time);
    }
  }, [availability, selectedStartTime]);

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const platformFeePercent = appSettings?.platform_fee || 15;
      const basePrice = availability.price_per_hour * selectedHours;
      const platformFee = basePrice * (platformFeePercent / 100);
      const totalAmount = basePrice + platformFee;
      const companionPayout = basePrice * (1 - platformFeePercent / 100);

      // Calculate end time based on selected start time and hours
      const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
      const endHour = startHour + selectedHours;
      const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;

      const booking = await base44.entities.Booking.create({
        availability_id: availabilityId,
        companion_id: availability.companion_id,
        companion_name: availability.companion_name,
        companion_photo: availability.companion_photo,
        seeker_id: user.id,
        seeker_name: user.display_name || user.full_name,
        seeker_photo: user.profile_photos?.[0],
        date: availability.date,
        start_time: selectedStartTime,
        end_time: endTime,
        duration_hours: selectedHours,
        area: availability.area,
        city: availability.city,
        base_price: basePrice,
        platform_fee: platformFee,
        total_amount: totalAmount,
        companion_payout: companionPayout,
        status: 'pending',
        escrow_status: 'held',
        chat_enabled: true,
        request_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

      await base44.entities.Availability.update(availabilityId, { status: 'pending' });

      // Create notification for companion
      await base44.entities.Notification.create({
        user_id: availability.companion_id,
        type: 'booking_request',
        title: '🔔 New Booking Request!',
        message: `${user.display_name || user.full_name} wants to book you for ${selectedHours}h on ${format(new Date(availability.date), 'MMM d')}`,
        booking_id: booking.id,
        amount: companionPayout,
        action_url: createPageUrl(`BookingView?id=${booking.id}`)
      });

      return booking;
    },
    onSuccess: (booking) => {
      window.location.href = createPageUrl(`BookingView?id=${booking.id}`);
    },
    onError: (error) => {
      console.error('Booking creation failed:', error);
      setBooking(false);
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

  const platformFeePercent = appSettings?.platform_fee || 15;
  const basePrice = availability.price_per_hour * selectedHours;
  const platformFee = basePrice * (platformFeePercent / 100);
  const totalAmount = basePrice + platformFee;

  return (
    <div className="min-h-screen bg-slate-50 pb-48">
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
                {reviews.length > 0 && companionUser?.average_rating > 0 && (
                  <div className="flex items-center gap-3">
                    <RatingStars rating={companionUser.average_rating} />
                    <span className="text-white/80 text-sm">({reviews.length} reviews)</span>
                  </div>
                )}
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
                {reviews.length > 0 && companionUser?.average_rating > 0 && (
                  <div className="flex items-center gap-3">
                    <RatingStars rating={companionUser.average_rating} />
                    <span className="text-white/80 text-sm">({reviews.length} reviews)</span>
                  </div>
                )}
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
                <p className="text-xs text-slate-500">Area</p>
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
                  {availability.languages?.join(', ') || 'English'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Other Available Slots */}
        {companionAvailabilities.length > 1 && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-violet-500" />
              Other Available Times
            </h3>
            <div className="space-y-2">
              {companionAvailabilities.filter(a => a.id !== availabilityId).slice(0, 4).map((slot) => (
                <a
                  key={slot.id}
                  href={createPageUrl(`BookingDetails?id=${slot.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {format(new Date(slot.date), 'EEE, MMM d')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">₹{slot.price_per_hour}/hr</p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Interests & About */}
        {(availability.interests?.length > 0 || companionUser?.hobbies?.length > 0 || companionUser?.personality_traits?.length > 0) && (
          <Card className="p-4">
            {availability.interests?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availability.interests.map((interest, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-violet-100 text-violet-700">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {companionUser?.hobbies?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Hobbies</h3>
                <div className="flex flex-wrap gap-2">
                  {companionUser.hobbies.map((hobby, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-700">
                      {hobby}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {companionUser?.personality_traits?.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Personality</h3>
                <div className="flex flex-wrap gap-2">
                  {companionUser.personality_traits.map((trait, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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

        {/* Time & Duration Selection */}
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Choose Your Time Slot</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Start Time</label>
              <Select value={selectedStartTime} onValueChange={(v) => {
                setSelectedStartTime(v);
                // Reset hours if current selection exceeds new max
                const [newStartHour] = v.split(':').map(Number);
                const [endHour] = availability.end_time.split(':').map(Number);
                const newMax = Math.min(endHour - newStartHour, 4);
                if (selectedHours > newMax) {
                  setSelectedHours(newMax);
                }
              }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStartTimes.map(time => (
                    <SelectItem key={time} value={time}>
                      {formatTime12Hour(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Duration</label>
              <Select value={String(selectedHours)} onValueChange={(v) => setSelectedHours(Number(v))}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxHoursAvailable }, (_, i) => i + 1).map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h > 1 ? 's' : ''} - ₹{availability.price_per_hour * h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStartTime && (
              <div className="p-3 bg-violet-50 rounded-lg">
                <p className="text-sm text-violet-700">
                  <span className="font-medium">Selected:</span> {formatTime12Hour(selectedStartTime)} - {formatTime12Hour((() => {
                    const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
                    const endHour = startHour + selectedHours;
                    return `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                  })())} ({selectedHours}h)
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 safe-bottom">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 flex-shrink">
              <p className="text-sm text-slate-500">Total for {selectedHours}h</p>
              <p className="text-2xl font-bold text-slate-900">₹{Math.ceil(totalAmount)}</p>
            </div>
            <Button
              onClick={handleBook}
              disabled={booking || bookingMutation.isPending}
              className="h-14 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-base font-semibold rounded-xl flex-shrink-0 ml-3"
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