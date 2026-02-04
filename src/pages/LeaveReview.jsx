import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Star, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function LeaveReview() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  
  const [user, setUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const results = await base44.entities.Booking.filter({ id: bookingId });
      return results[0];
    },
    enabled: !!bookingId
  });

  const { data: existingReview } = useQuery({
    queryKey: ['existing-review', bookingId, user?.id],
    queryFn: async () => {
      const reviews = await base44.entities.Review.filter({ 
        booking_id: bookingId, 
        reviewer_id: user.id 
      });
      return reviews[0];
    },
    enabled: !!bookingId && !!user?.id
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const isSeeker = user.id === booking.seeker_id;
      const revieweeId = isSeeker ? booking.companion_id : booking.seeker_id;
      
      // Check for existing review to prevent duplicates
      const existingReviews = await base44.entities.Review.filter({
        booking_id: bookingId,
        reviewer_id: user.id
      });
      
      if (existingReviews.length > 0) {
        throw new Error('You have already submitted a review for this booking.');
      }
      
      await base44.entities.Review.create({
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewer_name: user.full_name,
        reviewee_id: revieweeId,
        rating: rating,
        comment: comment,
        reviewer_role: isSeeker ? 'seeker' : 'companion'
      });

      // Update the reviewee's average rating
      const allReviews = await base44.entities.Review.filter({ reviewee_id: revieweeId });
      const avgRating = (allReviews.reduce((sum, r) => sum + r.rating, 0) + rating) / (allReviews.length + 1);
      
      await base44.entities.User.update(revieweeId, {
        average_rating: avgRating,
        total_reviews: allReviews.length + 1
      });

      // Create notification for the reviewee
      await base44.entities.Notification.create({
        user_id: revieweeId,
        type: 'review_received',
        title: '⭐ New Review!',
        message: `${user.full_name} left you a ${rating}-star review${comment ? ': "' + comment.substring(0, 50) + (comment.length > 50 ? '..."' : '"') : ''}`,
        booking_id: bookingId,
        action_url: createPageUrl('Profile')
      });
    },
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      setTimeout(() => {
        window.location.href = createPageUrl(`BookingView?id=${bookingId}`);
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit review');
    }
  });

  if (!booking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (existingReview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8F9FA' }}>
        <Card className="p-6 max-w-md text-center" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#4ECDC4' }}>
            <Star className="w-8 h-8" style={{ color: '#FFFFFF' }} />
          </div>
          <h2 className="text-xl font-extrabold mb-2" style={{ color: '#2D3436' }}>Already Reviewed</h2>
          <p className="mb-4" style={{ color: '#636E72' }}>You've already left a review for this meetup</p>
          <Button 
            onClick={() => window.history.back()}
            className="font-bold"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const isSeeker = user.id === booking.seeker_id;
  const otherPartyName = isSeeker ? booking.companion_name : booking.seeker_name;
  const canSubmit = rating > 0;

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
          <h1 className="font-bold" style={{ color: '#2D3436' }}>Leave a Review</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <Card className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              How was your meetup with {otherPartyName}?
            </h2>
            <p className="text-sm text-slate-600">
              Your feedback helps maintain quality on our platform
            </p>
          </div>

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                whileTap={{ scale: 0.9 }}
                className="focus:outline-none"
              >
                <Star
                  className={`w-12 h-12 transition-all ${
                    star <= (hoveredRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              </motion.button>
            ))}
          </div>

          {rating > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-lg font-semibold text-slate-900 mb-4"
            >
              {rating === 5 && '⭐ Excellent!'}
              {rating === 4 && '😊 Great!'}
              {rating === 3 && '👍 Good'}
              {rating === 2 && '😐 Okay'}
              {rating === 1 && '😞 Poor'}
            </motion.p>
          )}

          {/* Comment */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Share your experience (optional)
            </label>
            <Textarea
              placeholder="What did you like? Any suggestions?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-32"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={() => submitReviewMutation.mutate()}
            disabled={!canSubmit || submitReviewMutation.isPending}
            className="w-full h-14 rounded-xl text-lg font-bold"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            {submitReviewMutation.isPending ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Review
              </>
            )}
          </Button>
        </Card>

        <p className="text-xs text-center text-slate-500">
          Reviews are public and help others make informed decisions
        </p>
      </div>
    </div>
  );
}