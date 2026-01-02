import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'seeker',
      title: 'Find Companionship',
      subtitle: 'I want to meet people',
      description: 'Discover verified companions for meaningful conversations and experiences at public venues',
      icon: Search,
      features: ['Browse companions', 'Book meetups', 'Join group events'],
      gradient: 'from-blue-500 to-violet-600'
    },
    {
      id: 'companion',
      title: 'Offer Companionship',
      subtitle: 'I want to be a companion',
      description: 'Share your time and create meaningful connections while earning on your own schedule',
      icon: Sparkles,
      features: ['Set your rates', 'Manage availability', 'Build reputation'],
      gradient: 'from-violet-600 to-fuchsia-600'
    }
  ];

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await base44.auth.updateMe({ user_role: selectedRole });
      window.location.href = createPageUrl('TermsAcceptance');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            How would you like to use Circle?
          </h1>
          <p className="text-slate-600">
            Choose your primary role. You can always switch later.
          </p>
        </motion.div>

        <div className="space-y-4 mb-8">
          {roles.map((role, idx) => (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "w-full text-left p-6 rounded-3xl border-2 transition-all duration-300",
                selectedRole === role.id
                  ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10"
                  : "border-slate-200 bg-white hover:border-violet-200"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                  role.gradient
                )}>
                  <role.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {role.title}
                    </h3>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedRole === role.id
                        ? "border-violet-500 bg-violet-500"
                        : "border-slate-300"
                    )}>
                      {selectedRole === role.id && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{role.subtitle}</p>
                  <p className="text-sm text-slate-600 mb-4">{role.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.features.map((feature) => (
                      <span 
                        key={feature}
                        className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-2xl disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}