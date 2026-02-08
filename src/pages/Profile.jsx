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
      {/* Header with profile hero */}
      <div className="relative bg-white">
        {/* Photo section */}
        <div className="relative">
          <div className="aspect-[16/10] sm:aspect-[2/1] bg-slate-100 overflow-hidden">
            {user?.profile_photos?.length > 0 ? (
              <PhotoCarousel 
                photos={user.profile_photos} 
                userName={user?.full_name || 'User'}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <Camera className="w-10 h-10 text-slate-300" />
              </div>
            )}
          </div>
          
          {/* Upload button overlay */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || ((user?.profile_photos?.length || 0) >= 5)}
            className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-slate-700" />
            )}
          </button>
          
          {/* Notification bell */}
          <div className="absolute top-3 right-3">
            <div className="bg-white/90 backdrop-blur rounded-full p-1.5 shadow-md">
              <NotificationBell user={user} />
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="px-5 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-extrabold text-slate-900 truncate">
                  {user?.display_name || user?.full_name || 'Guest User'}
                </h1>
                <SafetyBadge verified={user?.kyc_status === 'verified'} />
              </div>
              <p className="text-sm text-slate-400 mb-3">{user?.email}</p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-white">
                  {user?.user_role || 'User'}
                </span>
                {reviews.length > 0 && avgRating && (
                  <Link 
                    to={createPageUrl(`UserProfile?id=${user.id}`)}
                    className="flex items-center gap-1.5 text-sm hover:opacity-80"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-700">{avgRating.toFixed(1)}</span>
                    <span className="text-slate-400">({reviews.length})</span>
                  </Link>
                )}
              </div>
            </div>
            <Link to={createPageUrl('EditProfile')}>
              <Button size="sm" variant="outline" className="rounded-full h-9 px-4 text-xs font-bold border-slate-200">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </Link>
          </div>

          {/* Bio */}
          {user?.bio && (
            <p className="text-sm text-slate-500 mt-4 leading-relaxed">{user.bio}</p>
          )}

          {/* Quick stats */}
          <div className="flex gap-6 mt-5 pt-5 border-t border-slate-100">
            <div className="text-center">
              <p className="text-lg font-extrabold text-slate-900">{user?.city || '—'}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">City</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-slate-900">{user?.languages?.length || 0}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Languages</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-slate-900">{user?.interests?.length || 0}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Interests</p>
            </div>
          </div>

          {/* Social Links */}
          {(user?.instagram_username || user?.snapchat_username) && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              {user?.instagram_username && (
                <a href={`https://instagram.com/${user.instagram_username}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors">
                  @{user.instagram_username}
                </a>
              )}
              {user?.snapchat_username && (
                <a href={`https://snapchat.com/add/${user.snapchat_username}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors">
                  @{user.snapchat_username}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {/* Video Introduction */}
        {user?.video_intro_url && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Video Intro</p>
            <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden">
              <video src={user.video_intro_url} controls className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Tags Section - combined interests, hobbies, personality, languages */}
        {(user?.interests?.length > 0 || user?.hobbies?.length > 0 || user?.personality_traits?.length > 0 || user?.languages?.length > 0) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            {user?.interests?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.interests.map((interest, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user?.hobbies?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hobbies</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.hobbies.map((hobby, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100">
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user?.personality_traits?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Personality</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.personality_traits.map((trait, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user?.languages?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.languages.map((lang, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Role Switcher */}
        <RoleSwitcher user={user} />

        {/* Admin Panel Access */}
        {(user?.user_role === 'admin' || user?.role === 'admin') && (
          <Link to={createPageUrl('AdminDashboard')}>
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Admin Panel</h3>
                  <p className="text-xs text-white/60">Manage platform</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>
          </Link>
        )}

        {/* Menu */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {menuItems.filter(item => item.page !== 'EditProfile').map((item, idx, arr) => (
            <Link
              key={item.label}
              to={createPageUrl(item.page)}
              className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50"
              style={{ borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-slate-500" />
              </div>
              <span className="flex-1 text-sm font-bold text-slate-700">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-red-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}