import React, { useState, useEffect, useTransition } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Search, Shield, CheckCircle, XCircle, 
  ArrowLeft, AlertTriangle, Eye, Ban, UserX, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [, startTransition] = useTransition();

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      if (user.user_role !== 'admin' && user.role !== 'admin') {
        window.location.href = createPageUrl('Discover');
      }
    };
    checkAdmin();
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200)
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ userId, status }) => {
      await base44.entities.User.update(userId, { kyc_status: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    }
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, days, reason }) => {
      const suspensionUntil = new Date();
      suspensionUntil.setDate(suspensionUntil.getDate() + days);
      await base44.entities.User.update(userId, { 
        account_status: 'suspended',
        suspension_until: suspensionUntil.toISOString(),
        suspension_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    }
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      await base44.entities.User.update(userId, { 
        account_status: 'banned',
        banned_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    }
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { 
        account_status: 'active',
        suspension_until: null,
        suspension_reason: null,
        banned_reason: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    }
  });

  const handleSuspend = (userId) => {
    const days = prompt('Suspend for how many days?', '7');
    if (!days) return;
    const reason = prompt('Reason for suspension?', 'Violation of community guidelines');
    if (!reason) return;
    suspendMutation.mutate({ userId, days: parseInt(days), reason });
  };

  const handleBan = (userId) => {
    const reason = prompt('Reason for permanent ban?', 'Multiple violations');
    if (!reason) return;
    if (confirm('Permanently ban this user? This action cannot be undone.')) {
      banMutation.mutate({ userId, reason });
    }
  };

  const handleDelete = (userId) => {
    if (confirm('Delete this user permanently? All their data will be removed. This action cannot be undone.')) {
      deleteMutation.mutate(userId);
    }
  };

  const pendingUsers = allUsers.filter(u => !u.kyc_status || u.kyc_status === 'pending');
  const verifiedUsers = allUsers.filter(u => u.kyc_status === 'verified');
  const companions = allUsers.filter(u => u.user_role === 'companion');
  const seekers = allUsers.filter(u => u.user_role === 'seeker');

  const filteredUsers = (users) => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  };

  const getDisplayUsers = () => {
    switch (activeTab) {
      case 'pending': return filteredUsers(pendingUsers);
      case 'companions': return filteredUsers(companions);
      case 'seekers': return filteredUsers(seekers);
      case 'all': return filteredUsers(allUsers);
      default: return [];
    }
  };

  const displayUsers = getDisplayUsers();

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = createPageUrl('AdminDashboard')}
              className="rounded-xl"
              style={{ color: '#2D3436' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>User Management</h1>
              <p className="text-sm" style={{ color: '#636E72' }}>{allUsers.length} total users</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                startTransition(() => {
                  setSearchQuery(value);
                });
              }}
              className="pl-10 h-12 rounded-xl"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-slate-100 p-1 rounded-xl overflow-x-auto flex">
              <TabsTrigger value="pending" className="flex-1 rounded-lg text-sm">
                Pending ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="companions" className="flex-1 rounded-lg text-sm">
                Companions ({companions.length})
              </TabsTrigger>
              <TabsTrigger value="seekers" className="flex-1 rounded-lg text-sm">
                Seekers ({seekers.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 rounded-lg text-sm">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#B2BEC3' }} />
            <h3 className="font-bold mb-2" style={{ color: '#2D3436' }}>No users found</h3>
            <p style={{ color: '#636E72' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayUsers.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={user.profile_photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                      alt={user.full_name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{user.full_name}</h3>
                        <Badge className={
                          user.kyc_status === 'verified' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : user.kyc_status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }>
                          {user.kyc_status || 'pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{user.email}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {user.user_role || 'user'}
                        </Badge>
                        {user.account_status === 'suspended' && (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Ban className="w-3 h-3 mr-1" />
                            Suspended
                          </Badge>
                        )}
                        {user.account_status === 'banned' && (
                          <Badge className="bg-red-100 text-red-700">
                            <UserX className="w-3 h-3 mr-1" />
                            Banned
                          </Badge>
                        )}
                        {(user.report_count || 0) > 0 && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {user.report_count} Reports
                          </Badge>
                        )}
                        {user.city && (
                          <span className="text-xs text-slate-500">{user.city}</span>
                        )}
                        {user.created_date && (
                          <span className="text-xs text-slate-500">
                            Joined {format(new Date(user.created_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {user.kyc_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => verifyMutation.mutate({ userId: user.id, status: 'verified' })}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyMutation.mutate({ userId: user.id, status: 'rejected' })}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {user.account_status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuspend(user.id)}
                            className="border-amber-200 text-amber-600 hover:bg-amber-50"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBan(user.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {(user.account_status === 'suspended' || user.account_status === 'banned') && (
                        <Button
                          size="sm"
                          onClick={() => unbanMutation.mutate(user.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Restore
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Status warnings */}
                  {user.account_status === 'suspended' && user.suspension_reason && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-start gap-2 text-amber-700">
                        <Ban className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Suspended</p>
                          <p className="text-xs">{user.suspension_reason}</p>
                          {user.suspension_until && (
                            <p className="text-xs mt-1">Until: {format(new Date(user.suspension_until), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {user.account_status === 'banned' && user.banned_reason && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-start gap-2 text-red-700">
                        <UserX className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Permanently Banned</p>
                          <p className="text-xs">{user.banned_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(user.report_count || 0) >= 3 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">⚠️ {user.report_count} reports - Consider banning</span>
                    </div>
                  )}
                  
                  {(user.no_show_count || 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">{user.no_show_count} no-show(s) recorded</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}