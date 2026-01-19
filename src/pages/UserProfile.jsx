import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import RatingStars from '../components/ui/RatingStars';
import PhotoCarousel from '../components/profile/PhotoCarousel';
import { 
  ArrowLeft, MapPin, Briefcase, MessageCircle, Calendar, 
  Languages, Heart, Shield, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setCurrentUser(userData);
    };
    loadUser();
  }, []);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');
      // Use backend function to fetch user profile (bypasses User entity security restrictions)
      const response = await base44.functions.invoke('getUserProfile', { userId });
      
      // Handle error response
      if (response.data?.error || !response.data?.user) {
        throw new Error(response.data?.error || 'User profile not available');
      }
      
      return response.data.user;
    },
    enabled: !!userId,
    retry: 1
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: async () => {
      const allReviews = await base44.entities.Review.filter({ reviewee_id: userId }, '-created_date', 20);
      // Remove duplicates - keep only the most recent review from each reviewer
      const uniqueReviews = allReviews.reduce((acc, review) => {
        const existingIndex = acc.findIndex(r => r.reviewer_id === review.reviewer_id);
        if (existingIndex === -1) {
          acc.push(review);
        }
        return acc;
      }, []);
      return uniqueReviews;
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">User Not Found</h2>
          {error && <p className="text-sm text-red-600 mb-4">{error.message}</p>}
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const hasRating = user.average_rating && user.total_reviews > 0;
  const photos = user.photos || user.profile_photos || [];
  const profilePhoto = photos[0] || user.profile_photo || user.profile_picture || user.photo;
  const interests = user.interests || [];
  const languages = user.languages || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="font-semibold text-slate-900">Profile</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Photo Section */}
        {photos && photos.length > 0 ? (
          <PhotoCarousel photos={photos} />
        ) : profilePhoto ? (
          <Card className="p-0 overflow-hidden">
            <img 
              src={profilePhoto}
              alt={user.full_name}
              className="w-full h-96 object-cover"
            />
          </Card>
        ) : null}

        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{user.display_name || user.full_name}</h2>
              {user.age && (
                <p className="text-slate-600">{user.age} years old</p>
              )}
            </div>
            {user.verified && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <Shield className="w-3.5 h-3.5 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Quick Info */}
          <div className="space-y-3">
            {user.city && (
              <div className="flex items-center gap-3 text-slate-700">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span>{user.city}</span>
              </div>
            )}
            {user.occupation && (
              <div className="flex items-center gap-3 text-slate-700">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <span>{user.occupation}</span>
              </div>
            )}
            {languages.length > 0 && (
              <div className="flex items-center gap-3 text-slate-700">
                <Languages className="w-5 h-5 text-slate-400" />
                <span>{languages.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Rating */}
          {hasRating && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-2xl font-bold text-slate-900">{user.average_rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-slate-600">
                  {user.total_reviews} review{user.total_reviews > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* About/Bio */}
        {user.bio && (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-3">About</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
          </Card>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-violet-600" />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, idx) => (
                <Badge key={idx} variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Reviews
            </h3>
            <div className="space-y-4">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900">{review.reviewer_name || 'Anonymous'}</p>
                    <RatingStars rating={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-600">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {reviews.length === 0 && user.user_role === 'companion' && (
          <Card className="p-6 text-center bg-slate-50">
            <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">No Reviews Yet</h3>
            <p className="text-sm text-slate-600">This companion is new to Circle</p>
          </Card>
        )}
      </div>
    </div>
  );
}