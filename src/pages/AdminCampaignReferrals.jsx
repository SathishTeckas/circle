import React, { useState, useCallback, useTransition } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Link as LinkIcon, Users, TrendingUp, Copy, Check, 
  Eye, Download, ToggleLeft, ToggleRight, Trash2, Gift, ArrowLeft 
} from 'lucide-react';
import { formatCurrency } from '@/components/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminCampaignReferrals() {
  const navigate = useNavigate();
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [, startTransition] = useTransition();

  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaign-referrals'],
    queryFn: async () => {
      const allCampaigns = await base44.entities.CampaignReferral.list('-created_date', 100);
      
      // Ensure SYSTEM campaign exists
      const systemCampaign = allCampaigns.find(c => c.code === 'SYSTEM');
      if (!systemCampaign) {
        await base44.entities.CampaignReferral.create({
          code: 'SYSTEM',
          campaign_name: 'System Referral Program',
          description: 'Default referral rewards for all users',
          is_active: true,
          referral_reward_amount: 100,
          referral_reward_type: 'wallet_credit'
        });
        // Refetch to include the new SYSTEM campaign
        return await base44.entities.CampaignReferral.list('-created_date', 100);
      }
      
      // Recalculate stats for all campaigns
      try {
        await base44.functions.invoke('recalculateCampaignStats', {});
      } catch (error) {
        console.error('Failed to recalculate stats:', error);
      }

      return allCampaigns;
    },
    staleTime: 10000
  });

  const { data: campaignUsers = [], data: campaignReferrals = [] } = useQuery({
    queryKey: ['campaign-referrals-detail', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      // Get referrals for this campaign
      const referrals = await base44.asServiceRole.entities.Referral.filter({
        referral_code: selectedCampaign.code,
        referral_type: 'campaign_signup'
      });
      
      // Fetch all users once, then match by ID
      const allUsers = await base44.asServiceRole.entities.User.list();
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      const users = referrals
        .filter(ref => ref.referee_id && userMap.has(ref.referee_id))
        .map(ref => ({
          ...userMap.get(ref.referee_id),
          referral_date: ref.created_date,
          referral_status: ref.status
        }));
      
      return users;
    },
    enabled: !!selectedCampaign,
    staleTime: 30000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const existing = campaigns.find(c => c.code === data.code);
      if (existing) {
        throw new Error('Code already exists');
      }
      return await base44.entities.CampaignReferral.create(data);
    },
    onSuccess: () => {
      toast.success('Campaign code created');
      setShowCreateDialog(false);
      refetchCampaigns();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create code');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active, code }) => {
      if (code === 'SYSTEM') {
        toast.error('Cannot disable system referral program');
        throw new Error('Cannot disable SYSTEM campaign');
      }
      return await base44.entities.CampaignReferral.update(id, { is_active });
    },
    onSuccess: () => {
      refetchCampaigns();
      toast.success('Status updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, code }) => {
      if (code === 'SYSTEM') {
        toast.error('Cannot delete system referral program');
        throw new Error('Cannot delete SYSTEM campaign');
      }
      return await base44.entities.CampaignReferral.delete(id);
    },
    onSuccess: () => {
      refetchCampaigns();
      toast.success('Campaign deleted');
    }
  });

  const handleCopy = useCallback((code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied');
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const handleCopyLink = useCallback((code) => {
    const link = `${window.location.origin}?campaign=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Campaign link copied');
  }, []);

  const generateCode = useCallback((callback) => {
    const code = `CAMP${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    callback(code);
  }, []);

  const handleExport = useCallback(() => {
    const csv = [
      ['Code', 'Campaign', 'Signups', 'Companions', 'Seekers', 'Bookings', 'Revenue', 'Status', 'Created'],
      ...campaigns.map(c => [
        c.code,
        c.campaign_name,
        c.total_signups || 0,
        c.total_companions || 0,
        c.total_seekers || 0,
        c.total_bookings || 0,
        c.total_revenue || 0,
        c.is_active ? 'Active' : 'Inactive',
        c.created_date ? format(new Date(c.created_date), 'yyyy-MM-dd') : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export started');
  }, [campaigns]);

  const totalStats = {
    signups: campaigns.reduce((sum, c) => sum + (c.total_signups || 0), 0),
    companions: campaigns.reduce((sum, c) => sum + (c.total_companions || 0), 0),
    seekers: campaigns.reduce((sum, c) => sum + (c.total_seekers || 0), 0),
    revenue: campaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Campaign Referral Codes</h1>
                <p className="text-sm text-slate-600">Track signups from marketing campaigns</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('AdminCreateCampaign'))}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Campaign</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.signups}</p>
                  <p className="text-xs text-slate-600">Total Signups</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.companions}</p>
                  <p className="text-xs text-slate-600">Companions</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.seekers}</p>
                  <p className="text-xs text-slate-600">Seekers</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalStats.revenue)}</p>
                  <p className="text-xs text-slate-600">Total Revenue</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="px-2 sm:px-4 py-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaign codes yet</h3>
            <p className="text-slate-600 mb-4">Create your first campaign referral code to start tracking</p>
            <Button onClick={() => navigate(createPageUrl('AdminCreateCampaign'))} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map(campaign => (
              <Card key={campaign.id} className="p-3 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{campaign.campaign_name}</h3>
                      <Badge className={cn(
                        campaign.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {campaign.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="px-2 sm:px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-xs sm:text-sm text-slate-900 truncate max-w-[200px]">
                        {campaign.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(campaign.code)}
                        className="h-8 w-8 p-0 shrink-0"
                        title="Copy code"
                      >
                        {copiedCode === campaign.code ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(campaign.code)}
                        className="h-8 w-8 p-0 shrink-0"
                        title="Copy campaign link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {campaign.code !== 'SYSTEM' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: campaign.id, 
                            is_active: !campaign.is_active,
                            code: campaign.code
                          })}
                          className="h-9 w-9 p-0 shrink-0"
                        >
                          {campaign.is_active ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this campaign code?')) {
                              deleteMutation.mutate({ id: campaign.id, code: campaign.code });
                            }
                          }}
                          className="h-9 w-9 p-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reward Badge */}
                {campaign.referral_reward_amount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg w-fit mb-3">
                    <Gift className="w-3.5 h-3.5" />
                    <span>₹{campaign.referral_reward_amount} {campaign.referral_reward_type === 'wallet_credit' ? 'credit' : 'discount'} per signup</span>
                  </div>
                )}

                {/* Edit Reward for SYSTEM */}
                {campaign.code === 'SYSTEM' && (
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      type="number"
                      value={campaign.referral_reward_amount}
                      onChange={(e) => {
                        const newAmount = Number(e.target.value);
                        if (newAmount >= 0) {
                          startTransition(async () => {
                            await base44.entities.CampaignReferral.update(campaign.id, {
                              referral_reward_amount: newAmount
                            });
                            queryClient.invalidateQueries({ queryKey: ['campaign-referrals'] });
                            toast.success('Reward amount updated');
                          });
                        }
                      }}
                      className="w-24 h-9"
                    />
                    <span className="text-sm text-slate-600">System reward per user</span>
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Signups</p>
                    <p className="text-base sm:text-lg font-semibold text-slate-900">{campaign.total_signups || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Companions</p>
                    <p className="text-base sm:text-lg font-semibold text-blue-600">{campaign.total_companions || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Seekers</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-600">{campaign.total_seekers || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Bookings</p>
                    <p className="text-base sm:text-lg font-semibold text-violet-600">{campaign.total_bookings || 0}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-slate-600 mb-1">Revenue</p>
                    <p className="text-base sm:text-lg font-semibold text-amber-600 truncate">{formatCurrency(campaign.total_revenue || 0)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>



      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Analytics: {selectedCampaign?.campaign_name}</DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{campaignUsers.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Companions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {campaignUsers.filter(u => u.user_role === 'companion').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Seekers</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {campaignUsers.filter(u => u.user_role === 'seeker' || u.active_role === 'seeker').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Verified</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {campaignUsers.filter(u => u.verification_status === 'verified').length}
                  </p>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Recent Users ({campaignUsers.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {campaignUsers.length === 0 ? (
                    <p className="text-sm text-slate-600 text-center py-8">No users yet</p>
                  ) : (
                    campaignUsers.map(user => (
                      <Card key={user.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.profile_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-slate-900">{user.display_name || user.full_name}</p>
                              <p className="text-xs text-slate-600">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn(
                              user.user_role === 'companion' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                            )}>
                              {user.user_role}
                            </Badge>
                            <p className="text-xs text-slate-500">
                              {user.created_date ? format(new Date(user.created_date), 'MMM d') : ''}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}