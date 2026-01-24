import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift } from 'lucide-react';

const CampaignFormDialog = React.memo(({ 
  open, 
  onOpenChange, 
  formData, 
  onFormChange, 
  onGenerateCode,
  onSubmit,
  isLoading 
}) => {
  const handleInputChange = useCallback((field, value) => {
    onFormChange(prev => ({ ...prev, [field]: value }));
  }, [onFormChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Campaign Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Campaign Name</label>
            <Input
              placeholder="Summer Campaign 2026"
              value={formData.campaign_name}
              onChange={(e) => handleInputChange('campaign_name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Referral Code</label>
            <div className="flex gap-2">
              <Input
                placeholder="CAMPAIGN2026"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={onGenerateCode}
                type="button"
              >
                Generate
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Description (Optional)</label>
            <Textarea
              placeholder="Facebook Ads - Summer Promotion"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Referral Incentive Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-violet-600" />
              <label className="text-sm font-semibold text-slate-900">Referral Incentive</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Reward Type</label>
                <Select
                  value={formData.referral_reward_type}
                  onValueChange={(value) => handleInputChange('referral_reward_type', value)}
                >
                  <SelectTrigger>
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
                <label className="text-xs text-slate-600 mb-1 block">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.referral_reward_amount}
                  onChange={(e) => handleInputChange('referral_reward_amount', Number(e.target.value))}
                  disabled={formData.referral_reward_type === 'none'}
                />
              </div>
            </div>
            {formData.referral_reward_type !== 'none' && (
              <p className="text-xs text-slate-500 mt-2">
                New signups using this code will receive ₹{formData.referral_reward_amount} {formData.referral_reward_type === 'wallet_credit' ? 'in their wallet' : 'as discount'}.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!formData.code || !formData.campaign_name || isLoading}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            {isLoading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CampaignFormDialog.displayName = 'CampaignFormDialog';

export default CampaignFormDialog;