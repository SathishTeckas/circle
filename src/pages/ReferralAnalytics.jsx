import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, TrendingUp, Users, CheckCircle, 
  DollarSign, Activity, Filter, Download 
} from 'lucide-react';
import { formatCurrency } from '@/components/utils/formatCurrency';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReferralAnalytics() {
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Fetch referrals where user is referrer
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      const allReferrals = await base44.entities.Referral.list();
      return allReferrals.filter(r => r.referrer_id === user.id);
    },
    enabled: !!user?.id
  });

  // Fetch referred users details
  const { data: referredUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['referred-users', user?.id],
    queryFn: async () => {
      if (referrals.length === 0) return [];
      const refereeIds = [...new Set(referrals.map(r => r.referee_id))];
      const users = await base44.entities.User.list();
      return users.filter(u => refereeIds.includes(u.id));
    },
    enabled: !!user?.id && referrals.length > 0
  });

  // Fetch bookings to determine conversion
  const { data: referralsWithBookings = [] } = useQuery({
    queryKey: ['referrals-with-bookings', user?.id],
    queryFn: async () => {
      const bookings = await base44.entities.Booking.list();
      return referrals.map(ref => {
        const userBookings = bookings.filter(b => b.seeker_id === ref.referee_id || b.companion_id === ref.referee_id);
        return {
          ...ref,
          has_bookings: userBookings.length > 0,
          booking_count: userBookings.length,
          last_booking: userBookings.length > 0 
            ? userBookings.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0].created_date
            : null
        };
      });
    },
    enabled: referrals.length > 0
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const total = referrals.length;
    const successful = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
    const earnings = referrals.reduce((sum, r) => {
      if (r.status === 'completed' || r.status === 'rewarded') {
        return sum + (r.reward_amount || 0);
      }
      return sum;
    }, 0);
    const withBookings = referralsWithBookings.filter(r => r.has_bookings).length;
    const conversionRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    const engagementRate = total > 0 ? Math.round((withBookings / total) * 100) : 0;

    return {
      total,
      successful,
      earnings,
      withBookings,
      conversionRate,
      engagementRate
    };
  }, [referrals, referralsWithBookings]);

  // Filter and search referred users
  const filteredReferrals = useMemo(() => {
    return referralsWithBookings.filter(ref => {
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'successful' && (ref.status === 'completed' || ref.status === 'rewarded')) ||
        (filterStatus === 'pending' && ref.status === 'pending') ||
        (filterStatus === 'engaged' && ref.has_bookings);
      
      const refUser = referredUsers.find(u => u.id === ref.referee_id);
      const matchesSearch = !searchTerm || 
        ref.referee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refUser?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [referralsWithBookings, referredUsers, filterStatus, searchTerm]);

  const handleExport = () => {
    const csv = [
      ['Referred User', 'Email', 'Status', 'Reward', 'Bookings', 'Signup Date'],
      ...filteredReferrals.map(ref => {
        const refUser = referredUsers.find(u => u.id === ref.referee_id);
        return [
          ref.referee_name || 'Unknown',
          refUser?.email || '',
          ref.status,
          ref.reward_amount || 0,
          ref.booking_count || 0,
          ref.created_date ? format(new Date(ref.created_date), 'yyyy-MM-dd') : ''
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const isLoading = referralsLoading || usersLoading;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 pt-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Referral Analytics</h1>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">Total Referrals</p>
              </div>
              <p className="text-2xl font-bold">{analytics.total}</p>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">Successful</p>
              </div>
              <p className="text-2xl font-bold">{analytics.successful}</p>
              <p className="text-xs text-white/60 mt-1">{analytics.conversionRate}% conversion</p>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">Earnings</p>
              </div>
              <p className="text-2xl font-bold">₹{analytics.earnings}</p>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">Engaged</p>
              </div>
              <p className="text-2xl font-bold">{analytics.withBookings}</p>
              <p className="text-xs text-white/60 mt-1">{analytics.engagementRate}% active</p>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-4xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold text-slate-900">{analytics.conversionRate}%</p>
                <p className="text-xs text-slate-500 mt-2">
                  {analytics.successful} of {analytics.total} completed
                </p>
              </div>
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Engagement Rate</p>
                <p className="text-3xl font-bold text-slate-900">{analytics.engagementRate}%</p>
                <p className="text-xs text-slate-500 mt-2">
                  {analytics.withBookings} made bookings
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Average Reward</p>
                <p className="text-3xl font-bold text-slate-900">
                  ₹{analytics.successful > 0 ? Math.round(analytics.earnings / analytics.successful) : 0}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Per successful referral
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Referred Users List */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Referred Users</h2>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {[
                { value: 'all', label: 'All' },
                { value: 'successful', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'engaged', label: 'With Bookings' }
              ].map(filter => (
                <Button
                  key={filter.value}
                  variant={filterStatus === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(filter.value)}
                  className="whitespace-nowrap"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No referrals yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReferrals.map((ref, idx) => {
                const refUser = referredUsers.find(u => u.id === ref.referee_id);
                const statusConfig = {
                  pending: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
                  completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
                  rewarded: { color: 'bg-emerald-100 text-emerald-700', label: 'Rewarded' }
                };
                const status = statusConfig[ref.status] || statusConfig.pending;

                return (
                  <motion.div
                    key={ref.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{ref.referee_name || 'Unknown'}</p>
                            <p className="text-sm text-slate-500">{refUser?.email || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 text-xs mb-1">Status</p>
                          <Badge className={cn(status.color, 'text-xs')}>
                            {status.label}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-slate-600 text-xs mb-1">Reward</p>
                          <p className="font-semibold text-slate-900">₹{ref.reward_amount || 0}</p>
                        </div>

                        <div>
                          <p className="text-slate-600 text-xs mb-1">Bookings</p>
                          <p className="font-semibold text-slate-900">{ref.booking_count || 0}</p>
                        </div>

                        <div>
                          <p className="text-slate-600 text-xs mb-1">Signup Date</p>
                          <p className="text-slate-700">
                            {ref.created_date ? format(new Date(ref.created_date), 'MMM d') : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {ref.last_booking && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                          Last active: {format(new Date(ref.last_booking), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold">{filteredReferrals.length}</span> of{' '}
              <span className="font-semibold">{referralsWithBookings.length}</span> referrals
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}