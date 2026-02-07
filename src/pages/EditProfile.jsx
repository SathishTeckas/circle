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
  ArrowLeft, Camera, X, Upload, Loader2, Save, Briefcase, GraduationCap, Users
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const INTERESTS = ['Movies', 'Music', 'Travel', 'Food', 'Sports', 'Art', 'Reading', 'Gaming', 'Photography', 'Fitness', 'Dancing', 'Theater', 'Comedy', 'Fashion', 'Technology', 'Science', 'Nature', 'Yoga', 'Meditation', 'Cooking', 'Wine & Dining', 'Coffee Culture', 'Nightlife', 'Adventure Sports', 'Spirituality', 'Politics', 'History', 'Architecture', 'Astronomy', 'Volunteering', 'Pets & Animals', 'Shopping', 'Cars & Bikes', 'Startups', 'Investing', 'Psychology', 'Podcasts', 'Blogging', 'Social Media', 'Board Games'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
const HOBBIES = ['Reading', 'Writing', 'Painting', 'Drawing', 'Photography', 'Cooking', 'Baking', 'Gardening', 'Hiking', 'Cycling'];
const PERSONALITY_TRAITS = ['Outgoing', 'Introverted', 'Adventurous', 'Calm', 'Spontaneous', 'Organized', 'Creative', 'Logical', 'Empathetic', 'Confident'];

const SERVICE_TYPES = [
  { value: 'companionship', label: 'Social Companion', description: 'Hangout, explore the city, attend events together' },
  { value: 'mentorship', label: 'Career Mentor', description: 'Career guidance, resume review, interview prep' },
  { value: 'study_partner', label: 'Study Partner', description: 'Exam prep, project collaboration, tutoring' },
  { value: 'all', label: 'All Services', description: 'Offer all types of companionship' }
];

const MENTORSHIP_AREAS = ['Career Guidance', 'Resume Review', 'Interview Prep', 'LinkedIn Optimization', 'Industry Insights', 'Internship Advice', 'Startup Mentoring', 'Leadership Skills', 'Communication', 'Networking'];
const STUDY_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Programming', 'Data Science', 'Economics', 'Accounting', 'English', 'History', 'Political Science', 'Psychology', 'MBA Prep', 'UPSC', 'CAT', 'GRE/GMAT', 'IELTS/TOEFL'];

export default function EditProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    city: '',
    interests: [],
    languages: [],
    hobbies: [],
    personality_traits: [],
    profile_photos: [],
    instagram_username: '',
    snapchat_username: '',
    service_type: 'companionship',
    mentorship_expertise: [],
    study_subjects: [],
    professional_background: '',
    education: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData({
          display_name: userData.display_name || userData.full_name || '',
          bio: userData.bio || '',
          city: userData.city || '',
          interests: userData.interests || [],
          languages: userData.languages || [],
          hobbies: userData.hobbies || [],
          personality_traits: userData.personality_traits || [],
          profile_photos: userData.profile_photos || [],
          instagram_username: userData.instagram_username || '',
          snapchat_username: userData.snapchat_username || '',
          service_type: userData.service_type || 'companionship',
          mentorship_expertise: userData.mentorship_expertise || [],
          study_subjects: userData.study_subjects || [],
          professional_background: userData.professional_background || '',
          education: userData.education || ''
        });
      } catch (error) {
        console.error('Error loading user in EditProfile:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe(formData);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      window.location.href = createPageUrl('Profile');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Error updating profile: ' + error.message);
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ 
        ...formData, 
        profile_photos: [...formData.profile_photos, file_url] 
      });
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload photo');
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#FFF3B8' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: '#2D3436' }} />
            </button>
            <h1 className="font-bold" style={{ color: '#2D3436' }}>Edit Profile</h1>
          </div>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="rounded-xl font-bold"
            style={{ background: '#FFD93D', color: '#2D3436' }}
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
            <Label>Display Name</Label>
            <Input
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="mt-1"
              placeholder="How you want to be called"
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

        {/* Service Type - Only show for companions */}
        {user?.user_role === 'companion' && (
          <Card className="p-4 space-y-4">
            <Label className="text-base font-bold" style={{ color: '#2D3436' }}>Service Type</Label>
            <p className="text-sm text-slate-500 -mt-2">What type of companionship do you offer?</p>
            
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPES.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setFormData({ ...formData, service_type: type.value })}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.service_type === type.value 
                      ? 'border-violet-500 bg-violet-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {type.value === 'companionship' && <Users className="w-4 h-4 text-violet-600" />}
                    {type.value === 'mentorship' && <Briefcase className="w-4 h-4 text-violet-600" />}
                    {type.value === 'study_partner' && <GraduationCap className="w-4 h-4 text-violet-600" />}
                    {type.value === 'all' && <span className="text-violet-600">✨</span>}
                    <span className="font-semibold text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{type.description}</p>
                </div>
              ))}
            </div>

            {/* Mentorship Expertise - Show when mentorship or all selected */}
            {(formData.service_type === 'mentorship' || formData.service_type === 'all') && (
              <div className="space-y-3 pt-2">
                <Label>Mentorship Expertise</Label>
                <div className="flex flex-wrap gap-2">
                  {MENTORSHIP_AREAS.map((area) => (
                    <Badge
                      key={area}
                      onClick={() => setFormData({
                        ...formData,
                        mentorship_expertise: formData.mentorship_expertise.includes(area)
                          ? formData.mentorship_expertise.filter(a => a !== area)
                          : [...formData.mentorship_expertise, area]
                      })}
                      className={
                        formData.mentorship_expertise.includes(area)
                          ? 'bg-orange-500 text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200'
                      }
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
                <div>
                  <Label className="mb-2 block">Professional Background</Label>
                  <Textarea
                    placeholder="Brief description of your professional experience..."
                    value={formData.professional_background}
                    onChange={(e) => setFormData({ ...formData, professional_background: e.target.value })}
                    className="h-20"
                    maxLength={300}
                  />
                </div>
              </div>
            )}

            {/* Study Subjects - Show when study_partner or all selected */}
            {(formData.service_type === 'study_partner' || formData.service_type === 'all') && (
              <div className="space-y-3 pt-2">
                <Label>Subjects You Can Help With</Label>
                <div className="flex flex-wrap gap-2">
                  {STUDY_SUBJECTS.map((subject) => (
                    <Badge
                      key={subject}
                      onClick={() => setFormData({
                        ...formData,
                        study_subjects: formData.study_subjects.includes(subject)
                          ? formData.study_subjects.filter(s => s !== subject)
                          : [...formData.study_subjects, subject]
                      })}
                      className={
                        formData.study_subjects.includes(subject)
                          ? 'bg-teal-500 text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200'
                      }
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
                <div>
                  <Label className="mb-2 block">Education</Label>
                  <Textarea
                    placeholder="Your educational background (e.g., B.Tech from IIT, MBA from ISB)..."
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="h-20"
                    maxLength={200}
                  />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Social Links */}
        <Card className="p-4 space-y-4">
          <Label className="text-base font-bold" style={{ color: '#2D3436' }}>Social Links</Label>
          <div>
            <Label className="flex items-center gap-2">
              <span className="w-5 h-5 rounded" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }} />
              Instagram
            </Label>
            <div className="flex items-center mt-1">
              <span className="h-10 px-3 flex items-center bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 text-sm">@</span>
              <Input
                value={formData.instagram_username}
                onChange={(e) => setFormData({ ...formData, instagram_username: e.target.value.replace('@', '') })}
                className="rounded-l-none"
                placeholder="your_username"
              />
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <span className="w-5 h-5 rounded" style={{ background: '#FFFC00' }} />
              Snapchat
            </Label>
            <div className="flex items-center mt-1">
              <span className="h-10 px-3 flex items-center bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 text-sm">@</span>
              <Input
                value={formData.snapchat_username}
                onChange={(e) => setFormData({ ...formData, snapchat_username: e.target.value.replace('@', '') })}
                className="rounded-l-none"
                placeholder="your_username"
              />
            </div>
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

        {/* Hobbies */}
        <Card className="p-4">
          <Label className="mb-3 block">Hobbies</Label>
          <div className="flex flex-wrap gap-2">
            {HOBBIES.map((hobby) => (
              <Badge
                key={hobby}
                onClick={() => setFormData({
                  ...formData,
                  hobbies: formData.hobbies.includes(hobby)
                    ? formData.hobbies.filter(h => h !== hobby)
                    : [...formData.hobbies, hobby]
                })}
                className={
                  formData.hobbies.includes(hobby)
                    ? 'bg-emerald-600 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200'
                }
              >
                {hobby}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Personality Traits */}
        <Card className="p-4">
          <Label className="mb-3 block">Personality Traits</Label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => (
              <Badge
                key={trait}
                onClick={() => setFormData({
                  ...formData,
                  personality_traits: formData.personality_traits.includes(trait)
                    ? formData.personality_traits.filter(t => t !== trait)
                    : [...formData.personality_traits, trait]
                })}
                className={
                  formData.personality_traits.includes(trait)
                    ? 'bg-fuchsia-600 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200'
                }
              >
                {trait}
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