import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Shield, Plus, Search, Trash2, ArrowLeft, 
  UserCheck, Mail, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200)
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      await base44.entities.User.update(userId, { user_role: role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    }
  });

  const admins = allUsers.filter(u => u.user_role === 'admin' || u.role === 'admin');
  
  const filteredAdmins = admins.filter(admin => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return admin.full_name?.toLowerCase().includes(query) || 
           admin.email?.toLowerCase().includes(query);
  });

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setInviting(true);
    setError('');
    setSuccess('');

    try {
      await base44.users.inviteUser(inviteEmail, 'admin');
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAdmin = async (userId) => {
    if (confirm('Remove admin privileges from this user?')) {
      await updateRoleMutation.mutate({ userId, role: 'user' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = createPageUrl('AdminDashboard')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Management</h1>
              <p className="text-sm text-slate-600">{admins.length} administrators</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* Invite New Admin */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Invite New Administrator</h2>
              <p className="text-sm text-slate-600">Send an invitation to add a new admin</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
              className="h-12 rounded-xl"
            />
            <Button
              onClick={handleInvite}
              disabled={inviting}
              className="h-12 px-6 bg-violet-600 hover:bg-violet-700 rounded-xl whitespace-nowrap"
            >
              {inviting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Admin
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}
        </Card>

        {/* Admin List */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Current Administrators</h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : filteredAdmins.length === 0 ? (
            <Card className="p-8 text-center">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">No admins found</h3>
              <p className="text-slate-600">
                {searchQuery ? 'Try a different search term' : 'Invite your first administrator'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAdmins.map((admin, idx) => (
                <motion.div
                  key={admin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                          <Shield className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{admin.full_name || 'Unnamed'}</h4>
                          <p className="text-sm text-slate-600">{admin.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge className="bg-violet-100 text-violet-700">Administrator</Badge>
                            {admin.kyc_status === 'verified' && (
                              <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}