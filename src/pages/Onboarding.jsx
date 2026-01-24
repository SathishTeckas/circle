import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, ArrowRight, ArrowLeft, Plus, X, User, Phone, Globe, Heart, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const INTERESTS = ['Movies', 'Music', 'Travel', 'Food', 'Sports', 'Art', 'Reading', 'Gaming', 'Photography', 'Fitness', 'Dancing', 'Theater', 'Comedy', 'Fashion', 'Technology', 'Science', 'Nature', 'Yoga', 'Meditation', 'Cooking', 'Wine & Dining', 'Coffee Culture', 'Nightlife', 'Adventure Sports', 'Spirituality', 'Politics', 'History', 'Architecture', 'Astronomy', 'Volunteering', 'Pets & Animals', 'Shopping', 'Cars & Bikes', 'Startups', 'Investing', 'Psychology', 'Podcasts', 'Blogging', 'Social Media', 'Board Games'];

const LANGUAGES = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil',
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu'
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kochi'
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [ageError, setAgeError] = useState('');
  const [nameError, setNameError] = useState('');
  const [userData, setUserData] = useState({
    display_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    city: '',
    bio: '',
    personality_type: '',
    profile_photos: [],
    interests: [],
    languages: [],
    referral_code: '',
    campaign_referral_code: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        
        // Get referral codes from localStorage or URL params
        const savedRefCode = localStorage.getItem('referral_code');
        const urlParams = new URLSearchParams(window.location.search);
        const campaignCode = urlParams.get('campaign');
        
        setUserData(prev => ({
          ...prev,
          display_name: user.display_name || '',
          phone: user.phone || '',
          date_of_birth: user.date_of_birth || '',
          gender: user.gender || '',
          city: user.city || '',
          bio: user.bio || '',
          personality_type: user.personality_type || '',
          profile_photos: user.profile_photos || [],
          interests: user.interests || [],
          languages: user.languages || [],
          referral_code: savedRefCode || '',
          campaign_referral_code: campaignCode || ''
        }));
        setPhoneVerified(user.phone_verified || false);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
      setUserData(prev => ({
        ...prev,
        profile_photos: [...prev.profile_photos, file_url]
      }));
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  };

  const removePhoto = (index) => {
    setUserData(prev => ({
      ...prev,
      profile_photos: prev.profile_photos.filter((_, i) => i !== index)
    }));
  };

  const toggleInterest = (interest) => {
    setUserData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const toggleLanguage = (language) => {
    setUserData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Generate unique referral code for this user (first 8 chars of ID)
      const user = await base44.auth.me();
      const myReferralCode = user.id.substring(0, 8).toUpperCase();
      
      // Save all data including display_name and my_referral_code via updateMe
      await base44.auth.updateMe({
        ...userData,
        my_referral_code: myReferralCode,
        onboarding_completed: false // Will be true after KYC
      });

      // Process referral code if provided
      if (userData.referral_code && userData.referral_code.trim()) {
        try {
          const result = await base44.functions.invoke('processReferral', {
            referral_code: userData.referral_code.trim()
          });
          // Clear from localStorage after successful processing
          localStorage.removeItem('referral_code');
        } catch (referralError) {
          console.error('Referral processing failed:', referralError);
          // Don't block onboarding if referral fails
        }
      }

      window.location.href = createPageUrl('KYCVerification');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return userData.display_name && !nameError && phoneVerified && userData.phone && userData.date_of_birth && !ageError && userData.gender;
      case 2:
        return userData.profile_photos.length >= 1;
      case 3:
        return userData.city && userData.languages.length > 0;
      case 4:
        return userData.interests.length >= 3;
      default:
        return true;
    }
  };

  const steps = [
    { title: 'Basic Info', icon: User },
    { title: 'Photos', icon: Camera },
    { title: 'Location', icon: MapPin },
    { title: 'Interests', icon: Heart }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Progress Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">
              Step {step} of 4
            </span>
            <span className="text-sm text-slate-500">
              {steps[step - 1].title}
            </span>
          </div>
          <div className="flex gap-2">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  idx < step ? "bg-violet-600" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Let's get to know you
                </h1>
                <p className="text-slate-600">
                  Basic information to create your profile
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 mb-2 block">Display Name</Label>
                  <Input
                    type="text"
                    placeholder="How you want to be called"
                    value={userData.display_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setUserData({ ...userData, display_name: name });
                      
                      // Validate name
                      if (name.length === 0) {
                        setNameError('');
                      } else if (name.length < 3) {
                        setNameError('Name must be at least 3 characters');
                      } else if (!/^[a-zA-Z\s]+$/.test(name)) {
                        setNameError('Name should only contain letters');
                      } else if (name.trim().length < 3) {
                        setNameError('Please enter a valid name');
                      } else {
                        setNameError('');
                      }
                    }}
                    className={cn(
                      "h-14 rounded-xl border-slate-200",
                      nameError && "border-red-500"
                    )}
                  />
                  {nameError ? (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-sm">{nameError}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">This is how others will see you on the platform</p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700 mb-2 flex items-center gap-2">
                    Phone Number
                    {phoneVerified && (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <div className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-600 font-medium">
                        +91
                      </div>
                      <Input
                        type="tel"
                        placeholder="10 digit number"
                        value={userData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setUserData({ ...userData, phone: value });
                        }}
                        disabled={phoneVerified}
                        className="h-14 pl-20 rounded-xl border-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        maxLength={10}
                      />
                    </div>
                    {!phoneVerified && userData.phone.length === 10 && (
                      <Button
                        onClick={() => setPhoneVerified(true)}
                        className="h-14 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 whitespace-nowrap"
                      >
                        OTP Verification
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700 mb-2 block">Date of Birth</Label>
                  <Input
                    type="date"
                    value={userData.date_of_birth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const dob = e.target.value;
                      setUserData({ ...userData, date_of_birth: dob });
                      
                      // Check if user is 18+
                      if (dob) {
                        const birthDate = new Date(dob);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        
                        if (age < 18) {
                          setAgeError('You must be at least 18 years old to use this platform');
                        } else {
                          setAgeError('');
                        }
                      }
                    }}
                    className={cn(
                      "h-14 rounded-xl border-slate-200",
                      ageError && "border-red-500"
                    )}
                  />
                  {ageError && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-sm">{ageError}</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700 mb-2 block">Gender</Label>
                  <Select
                    value={userData.gender}
                    onValueChange={(value) => setUserData({ ...userData, gender: value })}
                  >
                    <SelectTrigger className="h-14 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700 mb-2 block">Personality Type</Label>
                  <Select
                    value={userData.personality_type}
                    onValueChange={(value) => setUserData({ ...userData, personality_type: value })}
                  >
                    <SelectTrigger className="h-14 rounded-xl border-slate-200">
                      <SelectValue placeholder="How would you describe yourself?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="introvert">Introvert - I prefer quiet settings</SelectItem>
                      <SelectItem value="extrovert">Extrovert - I love social energy</SelectItem>
                      <SelectItem value="ambivert">Ambivert - A bit of both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Add your photos
                </h1>
                <p className="text-slate-600">
                  Add at least 1 clear photo (up to 6)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {userData.profile_photos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                
                {userData.profile_photos.length < 6 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all">
                    {uploading ? (
                      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500">Add Photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-slate-700">
                  {userData.profile_photos.length} / 6 photos added
                </p>
                <p className="text-xs text-slate-500">
                  Photos must clearly show your face and be recent
                </p>
                {userData.profile_photos.length < 1 ? (
                  <p className="text-xs text-red-600 font-medium">
                    At least 1 photo required
                  </p>
                ) : userData.profile_photos.length < 6 && (
                  <p className="text-xs text-violet-600 font-medium">
                    Add {6 - userData.profile_photos.length} more for a complete profile
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Location & Languages */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Where are you located?
                </h1>
                <p className="text-slate-600">
                  Help us find companions near you
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-slate-700 mb-2 block">City</Label>
                  <Select
                    value={userData.city}
                    onValueChange={(value) => setUserData({ ...userData, city: value })}
                  >
                    <SelectTrigger className="h-14 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700 mb-3 block flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Languages you speak
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <Badge
                        key={lang}
                        variant={userData.languages.includes(lang) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer px-4 py-2 text-sm transition-all",
                          userData.languages.includes(lang)
                            ? "bg-violet-600 hover:bg-violet-700"
                            : "hover:border-violet-400"
                        )}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700 mb-2 block">Short Bio (Optional)</Label>
                  <Textarea
                    placeholder="Tell people a bit about yourself..."
                    value={userData.bio}
                    onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                    className="rounded-xl border-slate-200 min-h-[100px]"
                    maxLength={300}
                  />
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    {userData.bio.length}/300
                  </p>
                </div>

                <div>
                   <Label className="text-slate-700 mb-2 block">Referral Code (Optional)</Label>
                   <Input
                     type="text"
                     placeholder="Enter friend's referral code"
                     value={userData.referral_code}
                     onChange={(e) => setUserData({ ...userData, referral_code: e.target.value })}
                     className="h-14 rounded-xl border-slate-200"
                   />
                   <p className="text-xs text-slate-500 mt-1">Get rewards when you enter a friend's code</p>
                 </div>

                 {userData.campaign_referral_code && (
                   <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                     <p className="text-xs text-violet-600">
                       ✓ Campaign: <span className="font-semibold">{userData.campaign_referral_code}</span>
                     </p>
                   </div>
                 )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Interests */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  What are you into?
                </h1>
                <p className="text-slate-600">
                  Select at least 3 interests for better matches
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    variant={userData.interests.includes(interest) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-4 py-2.5 text-sm transition-all",
                      userData.interests.includes(interest)
                        ? "bg-violet-600 hover:bg-violet-700"
                        : "hover:border-violet-400"
                    )}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>

              <p className="text-center text-sm text-slate-500">
                {userData.interests.length} selected
                {userData.interests.length < 3 && ` (${3 - userData.interests.length} more needed)`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-10">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="h-14 px-6 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          <Button
            onClick={() => step < 4 ? setStep(step + 1) : handleComplete()}
            disabled={!canProceed() || loading}
            className="flex-1 h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-xl disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : step < 4 ? (
              <>
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              'Complete Profile'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}