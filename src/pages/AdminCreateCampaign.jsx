import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCreateCampaign() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    code: '',
    campaign_name: '',
    description: '',
    referral_reward_amount: 0,
    referral_reward_type: 'none'
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const campaigns = await base44.entities.CampaignReferral.list();
      const existing = campaigns.find(c => c.code === data.code);
      if (existing) {
        throw new Error('Code already exists');
      }
      return await base44.entities.CampaignReferral.create(data);
    },
    onSuccess: () => {
      toast.success('Campaign code created');
      queryClient.invalidateQueries({ queryKey: ['campaign-referrals'] });
      navigate(createPageUrl('AdminCampaignReferrals'));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create code');
    }
  });

  const handleGenerateCode = useCallback(() => {
    const code = `CAMP${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    setFormData(prev => ({ ...prev, code }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.campaign_name) {
      toast.error('Campaign name and code are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('AdminCampaignReferrals'))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Create Campaign Code</h1>
            <p className="text-slate-600 mt-1">Set up a new referral campaign</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Name */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Campaign Name *</Label>
              <Input
                placeholder="Summer Campaign 2026"
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                className="h-12 rounded-xl text-base"
                disabled={createMutation.isPending}
              />
            </div>

            {/* Referral Code */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Referral Code *</Label>
              <div className="flex gap-3">
                <Input
                  placeholder="CAMPAIGN2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="h-12 rounded-xl font-mono text-base flex-1"
                  disabled={createMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateCode}
                  className="h-12 rounded-xl px-6"
                  disabled={createMutation.isPending}
                >
                  Generate
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Description (Optional)</Label>
              <textarea
                placeholder="Facebook Ads - Summer Promotion"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="4"
                className="flex min-h-[120px] w-full rounded-xl border border-input bg-transparent px-4 py-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={createMutation.isPending}
              />
            </div>

            {/* Referral Incentive Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-6">
                <Gift className="w-5 h-5 text-violet-600" />
                <label className="text-base font-semibold text-slate-900">Referral Incentive</label>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Reward Type</Label>
                  <Select
                    value={formData.referral_reward_type}
                    onValueChange={(value) => setFormData({ ...formData, referral_reward_type: value })}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Reward</SelectItem>
                      <SelectItem value="wallet_credit">Wallet Credit</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.referral_reward_amount}
                    onChange={(e) => setFormData({ ...formData, referral_reward_amount: Number(e.target.value) })}
                    className="h-12 rounded-xl"
                    disabled={formData.referral_reward_type === 'none' || createMutation.isPending}
                  />
                </div>
              </div>

              {formData.referral_reward_type !== 'none' && (
                <p className="text-sm text-slate-600 mt-4">
                  New signups using this code will receive ₹{formData.referral_reward_amount} {formData.referral_reward_type === 'wallet_credit' ? 'in their wallet' : 'as discount'}.
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('AdminCampaignReferrals'))}
                className="flex-1 h-12 rounded-xl"
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.code || !formData.campaign_name || createMutation.isPending}
                className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 rounded-xl text-base font-semibold"
              >
                {createMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Create Campaign'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}