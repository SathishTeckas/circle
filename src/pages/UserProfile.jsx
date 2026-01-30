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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8F9FA' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2D3436' }}>User Not Found</h2>
          {error && <p className="text-sm mb-4" style={{ color: '#E17055' }}>{error.message}</p>}
          <Button onClick={() => window.history.back()} className="font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>Go Back</Button>
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
          <h1 className="font-bold" style={{ color: '#2D3436' }}>Profile</h1>
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
        <Card className="p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{user.display_name || user.full_name}</h2>
              {user.age && (
                <p style={{ color: '#636E72' }}>{user.age} years old</p>
              )}
            </div>
            {user.verified && (
              <Badge className="font-bold" style={{ background: '#4ECDC4', color: '#2D3436' }}>
                <Shield className="w-3.5 h-3.5 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Quick Info */}
          <div className="space-y-3">
            {user.city && (
              <div className="flex items-center gap-3" style={{ color: '#636E72' }}>
                <MapPin className="w-5 h-5" style={{ color: '#FF6B6B' }} />
                <span>{user.city}</span>
              </div>
            )}
            {user.occupation && (
              <div className="flex items-center gap-3" style={{ color: '#636E72' }}>
                <Briefcase className="w-5 h-5" style={{ color: '#A8A4FF' }} />
                <span>{user.occupation}</span>
              </div>
            )}
            {languages.length > 0 && (
              <div className="flex items-center gap-3" style={{ color: '#636E72' }}>
                <Languages className="w-5 h-5" style={{ color: '#74B9FF' }} />
                <span>{languages.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Rating */}
          {hasRating && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#DFE6E9' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" style={{ color: '#FFB347', fill: '#FFB347' }} />
                  <span className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{user.average_rating.toFixed(1)}</span>
                </div>
                <span className="text-sm" style={{ color: '#636E72' }}>
                  {user.total_reviews} review{user.total_reviews > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* About/Bio */}
        {user.bio && (
          <Card className="p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3" style={{ color: '#2D3436' }}>About</h3>
            <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#636E72' }}>{user.bio}</p>
          </Card>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <Card className="p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Heart className="w-5 h-5" style={{ color: '#FF6B6B' }} />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, idx) => (
                <Badge key={idx} className="font-bold" style={{ background: '#A8A4FF', color: '#FFFFFF' }}>
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card className="p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Star className="w-5 h-5" style={{ color: '#FFB347' }} />
              Reviews
            </h3>
            <div className="space-y-4">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="pb-4 border-b last:border-0 last:pb-0" style={{ borderColor: '#DFE6E9' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold" style={{ color: '#2D3436' }}>{review.reviewer_name || 'Anonymous'}</p>
                    <RatingStars rating={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="text-sm" style={{ color: '#636E72' }}>{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {reviews.length === 0 && user.user_role === 'companion' && (
          <Card className="p-6 text-center" style={{ background: '#FFF3B8', border: 'none' }}>
            <Star className="w-12 h-12 mx-auto mb-3" style={{ color: '#FFD93D' }} />
            <h3 className="font-bold mb-1" style={{ color: '#2D3436' }}>No Reviews Yet</h3>
            <p className="text-sm" style={{ color: '#636E72' }}>This companion is new to Circle</p>
          </Card>
        )}
      </div>
    </div>
  );
}