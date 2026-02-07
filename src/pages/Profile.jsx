import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, Settings, Shield, Star, Heart, Globe, MapPin,
  ChevronRight, LogOut, Camera, Edit, Bell, HelpCircle, Video, Sparkles, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import SafetyBadge from '@/components/ui/SafetyBadge';
import RatingStars from '@/components/ui/RatingStars';
import PhotoCarousel from '@/components/profile/PhotoCarousel';
import NotificationBell from '../components/layout/NotificationBell';
import RoleSwitcher from '../components/profile/RoleSwitcher';
import FlagReviewButton from '../components/review/FlagReviewButton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Profile() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error loading current user in Profile:', error);
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const currentPhotos = user?.profile_photos || [];
      const newPhotos = [file_url, ...currentPhotos.filter((_, idx) => idx < 4)];
      await base44.auth.updateMe({ profile_photos: newPhotos });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB.');
      return;
    }

    setUploading(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error('Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allReviews = await base44.entities.Review.filter({ reviewee_id: user.id }, '-created_date', 20);
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
    enabled: !!user?.id
  });

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Discover'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8F9FA' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2D3436' }}>Profile Not Found</h2>
          <p style={{ color: '#636E72' }}>Please log in to view your profile.</p>
          <Button onClick={() => base44.auth.redirectToLogin(createPageUrl('Discover'))} className="mt-4 font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>Sign In</Button>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : null;

  const menuItems = [
    { icon: Edit, label: 'Edit Profile', page: 'EditProfile' },
    { icon: Bell, label: 'Notifications', page: 'Notifications' },
    { icon: Shield, label: 'Privacy & Safety', page: 'PrivacySafety' },
    { icon: AlertCircle, label: 'My Disputes', page: 'MyDisputes' },
    { icon: HelpCircle, label: 'Help & Support', page: 'HelpSupport' },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-16" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-extrabold" style={{ color: '#2D3436' }}>Profile</h1>
            <div style={{ color: '#2D3436' }}>
              <NotificationBell user={user} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-12 max-w-lg mx-auto space-y-4">
        {/* Photo Gallery */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ color: '#2D3436' }}>Photos</h3>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || ((user?.profile_photos?.length || 0) >= 5)}
                size="sm"
                className="h-8 font-bold"
                style={{ background: '#FFD93D', color: '#2D3436' }}
              >
                {uploading ? (
                  <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin mr-2" style={{ borderColor: '#2D3436', borderTopColor: 'transparent' }} />
                ) : (
                  <Camera className="w-4 h-4 mr-1" />
                )}
                Add Photo
              </Button>
            </div>
          </div>
          <PhotoCarousel 
            photos={user?.profile_photos || []} 
            userName={user?.full_name || 'User'}
          />
          <p className="text-xs text-center mt-2" style={{ color: '#636E72' }}>
            {(user?.profile_photos?.length || 0)}/5 photos
          </p>
        </Card>

        {/* Profile Card */}
        <Card className="p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-extrabold" style={{ color: '#2D3436' }}>{user?.display_name || user?.full_name || 'Guest User'}</h2>
            <SafetyBadge verified={user?.kyc_status === 'verified'} />
          </div>
          <p className="text-sm mb-3" style={{ color: '#636E72' }}>{user?.email || 'N/A'}</p>

          <div className="flex items-center gap-3 mb-4">
            <Badge className="capitalize font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>
              {user?.user_role || 'User'}
            </Badge>
            {reviews.length > 0 && avgRating && (
              <Link 
                to={createPageUrl(`UserProfile?id=${user.id}`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <RatingStars rating={avgRating} size="sm" />
                <span className="text-sm font-bold" style={{ color: '#FFB347' }}>
                  {avgRating.toFixed(1)} ({reviews.length})
                </span>
                <ChevronRight className="w-4 h-4" style={{ color: '#FFB347' }} />
              </Link>
            )}
            {reviews.length === 0 && user?.user_role === 'companion' && (
              <Badge className="font-bold" style={{ background: '#DFE6E9', color: '#636E72' }}>No reviews yet</Badge>
            )}
          </div>

          {/* Bio */}
          {user?.bio && (
            <p className="text-sm mb-4" style={{ color: '#636E72' }}>{user.bio}</p>
          )}

          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: '#DFE6E9' }}>
            <div className="text-center">
              <MapPin className="w-5 h-5 mx-auto mb-1" style={{ color: '#FF6B6B' }} />
              <p className="text-sm font-bold" style={{ color: '#2D3436' }}>{user?.city || 'Not set'}</p>
              <p className="text-xs" style={{ color: '#636E72' }}>Location</p>
            </div>
            <div className="text-center">
              <Globe className="w-5 h-5 mx-auto mb-1" style={{ color: '#74B9FF' }} />
              <p className="text-sm font-bold" style={{ color: '#2D3436' }}>{user?.languages?.length || 0}</p>
              <p className="text-xs" style={{ color: '#636E72' }}>Languages</p>
            </div>
            <div className="text-center">
              <Heart className="w-5 h-5 mx-auto mb-1" style={{ color: '#FF6B6B' }} />
              <p className="text-sm font-bold" style={{ color: '#2D3436' }}>{user?.interests?.length || 0}</p>
              <p className="text-xs" style={{ color: '#636E72' }}>Interests</p>
            </div>
          </div>
        </Card>

        {/* Video Introduction */}
        {user?.video_intro_url && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Video className="w-5 h-5" style={{ color: '#A8A4FF' }} />
              Video Introduction
            </h3>
            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
              <video 
                src={user.video_intro_url} 
                controls 
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        )}

        {/* Interests */}
        {user?.interests?.length > 0 && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Heart className="w-5 h-5" style={{ color: '#FF6B6B' }} />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, idx) => (
                <Badge key={idx} className="font-bold" style={{ background: '#A8A4FF', color: '#FFFFFF' }}>
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Hobbies */}
        {user?.hobbies?.length > 0 && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Heart className="w-5 h-5" style={{ color: '#4ECDC4' }} />
              Hobbies
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.hobbies.map((hobby, idx) => (
                <Badge key={idx} className="font-bold" style={{ background: '#4ECDC4', color: '#2D3436' }}>
                  {hobby}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Personality Traits */}
        {user?.personality_traits?.length > 0 && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#FFB347' }} />
              Personality
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.personality_traits.map((trait, idx) => (
                <Badge key={idx} className="font-bold" style={{ background: '#FFB347', color: '#2D3436' }}>
                  {trait}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Languages */}
        {user?.languages?.length > 0 && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Globe className="w-5 h-5" style={{ color: '#74B9FF' }} />
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.languages.map((lang, idx) => (
                <Badge key={idx} className="font-bold" style={{ background: '#74B9FF', color: '#2D3436' }}>
                  {lang}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Social Links */}
        {(user?.instagram_username || user?.snapchat_username) && (
          <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
              <Heart className="w-5 h-5" style={{ color: '#E1306C' }} />
              Social Links
            </h3>
            <div className="flex flex-wrap gap-3">
              {user?.instagram_username && (
                <a 
                  href={`https://instagram.com/${user.instagram_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#FFFFFF' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span className="font-bold text-sm">@{user.instagram_username}</span>
                </a>
              )}
              {user?.snapchat_username && (
                <a 
                  href={`https://snapchat.com/add/${user.snapchat_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: '#FFFC00', color: '#000000' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.166 0c-2.276 0-4.142 1.057-5.378 3.065-.953 1.548-1.055 4.062-1.055 5.044 0 .248-.072.536-.216.771-.145.234-.398.428-.713.498a11.24 11.24 0 0 1-.684.131c-.548.084-.875.204-1.059.394-.184.19-.277.452-.277.778 0 .326.093.588.277.778.184.19.511.31 1.059.394.219.034.44.076.684.131.315.07.568.264.713.498.144.235.216.523.216.771 0 .982.102 3.496 1.055 5.044 1.236 2.008 3.102 3.065 5.378 3.065s4.142-1.057 5.378-3.065c.953-1.548 1.055-4.062 1.055-5.044 0-.248.072-.536.216-.771.145-.234.398-.428.713-.498.244-.055.465-.097.684-.131.548-.084.875-.204 1.059-.394.184-.19.277-.452.277-.778 0-.326-.093-.588-.277-.778-.184-.19-.511-.31-1.059-.394a11.24 11.24 0 0 0-.684-.131c-.315-.07-.568-.264-.713-.498a1.377 1.377 0 0 1-.216-.771c0-.982-.102-3.496-1.055-5.044C16.308 1.057 14.442 0 12.166 0z"/>
                  </svg>
                  <span className="font-bold text-sm">@{user.snapchat_username}</span>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Role Switcher */}
        <RoleSwitcher user={user} />

        {/* Admin Panel Access */}
        {(user?.user_role === 'admin' || user?.role === 'admin') && (
          <Link to={createPageUrl('AdminDashboard')}>
            <Card className="p-4" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)', border: 'none' }}>
              <div className="flex items-center justify-between" style={{ color: '#2D3436' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.3)' }}>
                    <Shield className="w-6 h-6" style={{ color: '#2D3436' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Admin Panel</h3>
                    <p className="text-sm" style={{ color: 'rgba(45,52,54,0.7)' }}>Manage platform</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Card>
          </Link>
        )}

        {/* Menu */}
        <Card style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          {menuItems.map((item, idx) => (
            <Link
              key={item.label}
              to={createPageUrl(item.page)}
              className="w-full flex items-center gap-4 p-4 transition-colors"
              style={{ borderBottom: idx < menuItems.length - 1 ? '1px solid #DFE6E9' : 'none' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF3B8' }}>
                <item.icon className="w-5 h-5" style={{ color: '#2D3436' }} />
              </div>
              <span className="flex-1 text-left font-bold" style={{ color: '#2D3436' }}>
                {item.label}
              </span>
              <ChevronRight className="w-5 h-5" style={{ color: '#B2BEC3' }} />
            </Link>
          ))}
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-14 rounded-xl font-bold"
          style={{ borderColor: '#E17055', color: '#E17055', background: 'transparent' }}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}