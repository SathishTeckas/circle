import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Users, User, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RoleSwitcher({ user }) {
  const availableRoles = user?.available_roles || [user?.user_role || 'seeker'];
  const canSwitchRoles = availableRoles.length > 1;
  const activeRole = user?.active_role || user?.user_role;

  const switchRoleMutation = useMutation({
    mutationFn: async (newRole) => {
      await base44.auth.updateMe({ active_role: newRole });
      return newRole;
    },
    onSuccess: (newRole) => {
      toast.success(`Switched to ${newRole} mode`);
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => toast.error('Failed to switch role')
  });

  const enableRoleMutation = useMutation({
    mutationFn: async (roleToEnable) => {
      const newRoles = [...new Set([...availableRoles, roleToEnable])];
      await base44.auth.updateMe({ available_roles: newRoles, active_role: roleToEnable });
      return roleToEnable;
    },
    onSuccess: () => {
      toast.success('Role enabled! Page will reload...');
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: () => toast.error('Failed to enable role')
  });

  const handleToggle = () => {
    const newRole = activeRole === 'seeker' ? 'companion' : 'seeker';
    switchRoleMutation.mutate(newRole);
  };

  if (user?.user_role === 'admin') return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {canSwitchRoles ? (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Mode</p>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
            <button
              onClick={() => activeRole !== 'seeker' && handleToggle()}
              disabled={switchRoleMutation.isPending}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
                activeRole === 'seeker'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <User className="w-4 h-4" />
              Seeker
            </button>
            <button
              onClick={() => activeRole !== 'companion' && handleToggle()}
              disabled={switchRoleMutation.isPending}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
                activeRole === 'companion'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Users className="w-4 h-4" />
              Companion
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-sm text-slate-500 mb-3">
            {activeRole === 'seeker'
              ? 'Want to become a companion and earn?'
              : 'Want to find and book companions?'}
          </p>
          <Button
            onClick={() => enableRoleMutation.mutate(activeRole === 'seeker' ? 'companion' : 'seeker')}
            disabled={enableRoleMutation.isPending}
            className="w-full h-11 rounded-xl font-bold text-sm"
            style={{ background: '#2D3436', color: '#FFFFFF' }}
          >
            {enableRoleMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : activeRole === 'seeker' ? (
              <Users className="w-4 h-4 mr-2" />
            ) : (
              <User className="w-4 h-4 mr-2" />
            )}
            Enable {activeRole === 'seeker' ? 'Companion' : 'Seeker'} Mode
          </Button>
        </div>
      )}
    </div>
  );
}