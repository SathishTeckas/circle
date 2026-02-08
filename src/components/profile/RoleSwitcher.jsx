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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Role Management</h3>
            <p className="text-white/70 text-xs">Switch how you use BeThere</p>
          </div>
        </div>

        {canSwitchRoles ? (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <motion.div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer",
                    activeRole === 'seeker' ? "bg-white shadow-lg" : "hover:bg-white/10"
                  )}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => activeRole !== 'seeker' && handleToggle()}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center",
                    activeRole === 'seeker' ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-white/20"
                  )}>
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className={cn(
                    "font-bold text-sm",
                    activeRole === 'seeker' ? "text-slate-800" : "text-white/80"
                  )}>Seeker</span>
                </motion.div>

                <motion.div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer",
                    activeRole === 'companion' ? "bg-white shadow-lg" : "hover:bg-white/10"
                  )}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => activeRole !== 'companion' && handleToggle()}
                >
                  <span className={cn(
                    "font-bold text-sm",
                    activeRole === 'companion' ? "text-slate-800" : "text-white/80"
                  )}>Companion</span>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center",
                    activeRole === 'companion' ? "bg-gradient-to-br from-fuchsia-500 to-pink-600" : "bg-white/20"
                  )}>
                    <Users className="w-4 h-4 text-white" />
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                activeRole === 'seeker' ? "bg-white" : "bg-white/30"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                activeRole === 'companion' ? "bg-white" : "bg-white/30"
              )} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white/80 text-sm">
              {activeRole === 'seeker' 
                ? 'Want to become a companion? Start offering your time and earn.'
                : 'Want to find companions? Discover and book amazing people.'}
            </p>
            
            <Button
              onClick={() => handleEnableRole(activeRole === 'seeker' ? 'companion' : 'seeker')}
              disabled={enableRoleMutation.isPending}
              className="w-full h-12 rounded-xl font-bold bg-white hover:bg-white/90 text-slate-800 shadow-lg"
            >
              {enableRoleMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mr-2" />
              ) : activeRole === 'seeker' ? (
                <Users className="w-5 h-5 mr-2" />
              ) : (
                <User className="w-5 h-5 mr-2" />
              )}
              Enable {activeRole === 'seeker' ? 'Companion' : 'Seeker'} Mode
            </Button>

            <p className="text-xs text-white/60 text-center">
              You can switch between roles anytime after enabling
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}