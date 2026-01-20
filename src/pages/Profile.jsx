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
    await base44.auth.logout(createPageUrl('Welcome'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile Not Found</h2>
          <p className="text-slate-600">Please log in to view your profile.</p>
          <Button onClick={() => window.location.href = createPageUrl('Welcome')} className="mt-4">Go to Welcome</Button>
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
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 pt-8 pb-16">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white">Profile</h1>
            <div className="text-white">
              <NotificationBell user={user} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-12 max-w-lg mx-auto space-y-4">
        {/* Photo Gallery */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Photos</h3>
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
                className="h-8 bg-violet-600 hover:bg-violet-700"
              >
                {uploading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
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
          <p className="text-xs text-slate-500 text-center mt-2">
            {(user?.profile_photos?.length || 0)}/5 photos
          </p>
        </Card>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-bold text-slate-900">{user?.display_name || user?.full_name || 'Guest User'}</h2>
            <SafetyBadge verified={user?.kyc_status === 'verified'} />
          </div>
          <p className="text-sm text-slate-600 mb-3">{user?.email || 'N/A'}</p>

          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-violet-100 text-violet-700 capitalize">
              {user?.user_role || 'User'}
            </Badge>
            {reviews.length > 0 && avgRating && (
              <Link 
                to={createPageUrl(`UserProfile?id=${user.id}`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <RatingStars rating={avgRating} size="sm" />
                <span className="text-sm text-violet-600 font-medium">
                  {avgRating.toFixed(1)} ({reviews.length})
                </span>
                <ChevronRight className="w-4 h-4 text-violet-600" />
              </Link>
            )}
            {reviews.length === 0 && user?.user_role === 'companion' && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">No reviews yet</Badge>
            )}
          </div>

          {/* Bio */}
          {user?.bio && (
            <p className="text-slate-600 text-sm mb-4">{user.bio}</p>
          )}

          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <div className="text-center">
              <MapPin className="w-5 h-5 text-violet-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-slate-900">{user?.city || 'Not set'}</p>
              <p className="text-xs text-slate-500">Location</p>
            </div>
            <div className="text-center">
              <Globe className="w-5 h-5 text-violet-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-slate-900">{user?.languages?.length || 0}</p>
              <p className="text-xs text-slate-500">Languages</p>
            </div>
            <div className="text-center">
              <Heart className="w-5 h-5 text-violet-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-slate-900">{user?.interests?.length || 0}</p>
              <p className="text-xs text-slate-500">Interests</p>
            </div>
          </div>
        </Card>

        {/* Video Introduction */}
        {user?.video_intro_url && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Video className="w-5 h-5 text-violet-600" />
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
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, idx) => (
                <Badge key={idx} variant="secondary" className="bg-violet-100 text-violet-700">
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Hobbies */}
        {user?.hobbies?.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-500" />
              Hobbies
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.hobbies.map((hobby, idx) => (
                <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {hobby}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Personality Traits */}
        {user?.personality_traits?.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-500" />
              Personality
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.personality_traits.map((trait, idx) => (
                <Badge key={idx} variant="secondary" className="bg-fuchsia-100 text-fuchsia-700">
                  {trait}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Languages */}
        {user?.languages?.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.languages.map((lang, idx) => (
                <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700">
                  {lang}
                </Badge>
              ))}
            </div>
          </Card>
        )}



        {/* Role Switcher */}
        <RoleSwitcher user={user} />

        {/* Admin Panel Access */}
        {(user?.user_role === 'admin' || user?.role === 'admin') && (
          <Link to={createPageUrl('AdminDashboard')}>
            <Card className="p-4 bg-gradient-to-r from-violet-600 to-fuchsia-600">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Admin Panel</h3>
                    <p className="text-sm text-white/80">Manage platform</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Card>
          </Link>
        )}

        {/* Menu */}
        <Card className="divide-y divide-slate-100">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={createPageUrl(item.page)}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <item.icon className="w-5 h-5 text-slate-600" />
              </div>
              <span className="flex-1 text-left font-medium text-slate-900">
                {item.label}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          ))}
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-14 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}