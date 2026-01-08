import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Camera, X, Upload, Loader2, Save
} from 'lucide-react';
import { motion } from 'framer-motion';

const INTERESTS = ['Movies', 'Music', 'Travel', 'Food', 'Sports', 'Art', 'Reading', 'Gaming', 'Photography', 'Fitness'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];

export default function EditProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    city: '',
    interests: [],
    languages: [],
    profile_photos: []
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || '',
        bio: userData.bio || '',
        city: userData.city || '',
        interests: userData.interests || [],
        languages: userData.languages || [],
        profile_photos: userData.profile_photos || []
      });
      setLoading(false);
    };
    loadUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe(formData);
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Profile');
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ 
        ...formData, 
        profile_photos: [...formData.profile_photos, file_url] 
      });
    } catch (error) {
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData({
      ...formData,
      profile_photos: formData.profile_photos.filter((_, i) => i !== index)
    });
  };

  const toggleInterest = (interest) => {
    setFormData({
      ...formData,
      interests: formData.interests.includes(interest)
        ? formData.interests.filter(i => i !== interest)
        : [...formData.interests, interest]
    });
  };

  const toggleLanguage = (language) => {
    setFormData({
      ...formData,
      languages: formData.languages.includes(language)
        ? formData.languages.filter(l => l !== language)
        : [...formData.languages, language]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="font-semibold text-slate-900">Edit Profile</h1>
          </div>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 rounded-xl"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Photos */}
        <Card className="p-4">
          <Label className="mb-3 block">Profile Photos</Label>
          <div className="grid grid-cols-3 gap-3">
            {formData.profile_photos.map((photo, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square"
              >
                <img
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </motion.div>
            ))}
            {formData.profile_photos.length < 6 && (
              <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-500">Add Photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </Card>

        {/* Basic Info */}
        <Card className="p-4 space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Bio</Label>
            <Textarea
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="mt-1 h-24"
            />
          </div>

          <div>
            <Label>City</Label>
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white mt-1"
            >
              <option value="">Select city</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Interests */}
        <Card className="p-4">
          <Label className="mb-3 block">Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <Badge
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={
                  formData.interests.includes(interest)
                    ? 'bg-violet-600 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200'
                }
              >
                {interest}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Languages */}
        <Card className="p-4">
          <Label className="mb-3 block">Languages</Label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((language) => (
              <Badge
                key={language}
                onClick={() => toggleLanguage(language)}
                className={
                  formData.languages.includes(language)
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200'
                }
              >
                {language}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Save Button */}
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="w-full h-14 bg-violet-600 hover:bg-violet-700 rounded-xl text-lg"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}