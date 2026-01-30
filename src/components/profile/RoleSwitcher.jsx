import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Users, User, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RoleSwitcher({ user, onRoleChanged }) {
  const [isUpdating, setIsUpdating] = useState(false);

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
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast.error('Failed to switch role');
      console.error(error);
    }
  });

  const enableRoleMutation = useMutation({
    mutationFn: async (roleToEnable) => {
      const newRoles = [...new Set([...availableRoles, roleToEnable])];
      await base44.auth.updateMe({ 
        available_roles: newRoles,
        active_role: roleToEnable
      });
      return roleToEnable;
    },
    onSuccess: () => {
      toast.success('Role enabled! Page will reload...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast.error('Failed to enable role');
      console.error(error);
    }
  });

  const handleToggle = () => {
    const newRole = activeRole === 'seeker' ? 'companion' : 'seeker';
    switchRoleMutation.mutate(newRole);
  };

  const handleEnableRole = (role) => {
    enableRoleMutation.mutate(role);
  };

  if (user?.user_role === 'admin') {
    return null;
  }

  return (
    <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
      <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#2D3436' }}>
        <Sparkles className="w-5 h-5" style={{ color: '#FFB347' }} />
        Role Management
      </h3>

      {canSwitchRoles ? (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#636E72' }}>Switch between seeker and companion modes</p>
          
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'linear-gradient(to right, #FFF3B8, #FFB347)' }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ background: activeRole === 'seeker' ? '#2D3436' : '#DFE6E9' }}
              >
                <User className="w-5 h-5" style={{ color: activeRole === 'seeker' ? '#FFFFFF' : '#B2BEC3' }} />
              </div>
              <span className="font-bold" style={{ color: '#2D3436' }}>Seeker</span>
            </div>

            <Switch
              checked={activeRole === 'companion'}
              onCheckedChange={handleToggle}
              disabled={switchRoleMutation.isPending}
              className="data-[state=checked]:bg-fuchsia-600 data-[state=unchecked]:bg-violet-400"
            />

            <div className="flex items-center gap-3">
              <span className="font-bold" style={{ color: '#2D3436' }}>Companion</span>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ background: activeRole === 'companion' ? '#2D3436' : '#DFE6E9' }}
              >
                <Users className="w-5 h-5" style={{ color: activeRole === 'companion' ? '#FFFFFF' : '#B2BEC3' }} />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Currently active: <span className="font-semibold capitalize">{activeRole}</span>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {activeRole === 'seeker' 
              ? 'Want to become a companion? Enable companion mode to start offering your time.'
              : 'Want to find companions? Enable seeker mode to discover and book.'}
          </p>
          
          <Button
            onClick={() => handleEnableRole(activeRole === 'seeker' ? 'companion' : 'seeker')}
            disabled={enableRoleMutation.isPending}
            className="w-full h-12 rounded-xl font-bold"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            {enableRoleMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : activeRole === 'seeker' ? (
              <Users className="w-5 h-5 mr-2" />
            ) : (
              <User className="w-5 h-5 mr-2" />
            )}
            Enable {activeRole === 'seeker' ? 'Companion' : 'Seeker'} Mode
          </Button>

          <p className="text-xs text-slate-500 text-center">
            You can switch between roles anytime after enabling
          </p>
        </div>
      )}
    </Card>
  );
}