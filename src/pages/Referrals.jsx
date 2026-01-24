import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { 
  Gift, Users, Copy, CheckCircle, Share2, 
  ArrowLeft, IndianRupee, TrendingUp, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Referrals() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      
      // Generate and save referral code if not exists
      if (!userData.my_referral_code) {
        const generatedCode = userData.id.substring(0, 8).toUpperCase();
        await base44.auth.updateMe({ my_referral_code: generatedCode });
        userData.my_referral_code = generatedCode;
      }
      
      setUser(userData);
    };
    loadUser();
  }, []);

  // Use user's unique referral code
  const myReferralCode = user?.my_referral_code || '';
  const referralCode = myReferralCode;
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  // Fetch dynamic reward amount from SYSTEM campaign
  const { data: systemCampaign } = useQuery({
    queryKey: ['system-campaign'],
    queryFn: async () => {
      const campaigns = await base44.entities.CampaignReferral.filter({ code: 'SYSTEM' });
      return campaigns[0] || { referral_reward_amount: 100 };
    },
    staleTime: 60000
  });

  const rewardAmount = systemCampaign?.referral_reward_amount || 100;

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      // Get all referrals where user is EITHER referrer OR referee
      const allReferrals = await base44.entities.Referral.list();
      return allReferrals.filter(r => 
        r.referrer_id === user.id || r.referee_id === user.id
      );
    },
    enabled: !!user?.id
  });

  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  // Each referral record gives reward to BOTH parties
  const totalEarnings = completedReferrals.reduce((sum, r) => sum + (r.reward_amount || rewardAmount), 0);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Circle',
          text: `Join me on Circle! Use my referral code ${referralCode} and we both get ₹${rewardAmount} reward.`,
          url: referralLink
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 pt-8 pb-16">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Refer & Earn</h1>
              <p className="text-violet-100 text-sm">Get ₹{rewardAmount} for each friend</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <IndianRupee className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">₹{totalEarnings}</p>
              <p className="text-xs text-white/70">Earned</p>
            </Card>
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <Users className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">{completedReferrals.length}</p>
              <p className="text-xs text-white/70">Referred</p>
            </Card>
            <Card className="p-3 bg-white/10 backdrop-blur border-white/20 text-white">
              <TrendingUp className="w-5 h-5 mb-1 text-white/80" />
              <p className="text-2xl font-bold">{pendingReferrals.length}</p>
              <p className="text-xs text-white/70">Pending</p>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 max-w-lg mx-auto space-y-4">
        {/* Referral Code Card */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Your Referral Code</h3>
          
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <p className="text-xs text-slate-500 mb-1">Code</p>
                <p className="text-2xl font-bold text-violet-600 tracking-wider">{referralCode}</p>
              </div>
              <Button
                onClick={() => copyToClipboard(referralCode)}
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-500 mb-2">Referral Link</p>
            <div className="flex items-center gap-2">
              <Input
                value={referralLink}
                readOnly
                className="text-sm bg-white flex-1"
              />
              <Button
                onClick={() => copyToClipboard(referralLink)}
                variant="outline"
                size="icon"
                className="rounded-xl flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={shareReferral}
              className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
            <Link
              to={createPageUrl('ReferralAnalytics')}
              className="flex-1"
            >
              <Button
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics
              </Button>
            </Link>
          </div>
        </Card>

        {/* How it Works */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">How it Works</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-violet-600 font-semibold">1</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Share your code</p>
                <p className="text-sm text-slate-600">Send your referral code to friends</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-violet-600 font-semibold">2</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Friend signs up</p>
                <p className="text-sm text-slate-600">They create an account using your code</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-violet-600 font-semibold">3</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Get rewarded</p>
                <p className="text-sm text-slate-600">Both of you get ₹{rewardAmount} added to wallet</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Referral History */}
        {referrals.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Your Referrals</h3>
            <div className="space-y-3">
              {referrals.map((referral, idx) => (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {referral.referrer_id === user?.id 
                          ? `You referred ${referral.referee_name || 'New User'}`
                          : `Referred by ${referral.referrer_name || 'Someone'}`
                        }
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(referral.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {referral.status === 'rewarded' || referral.status === 'completed' ? (
                      <>
                        <p className="font-semibold text-emerald-600">+₹{referral.reward_amount || rewardAmount}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Earned
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        Pending
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}