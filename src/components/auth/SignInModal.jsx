import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Eye, EyeOff, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SignInModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In production, this would handle actual authentication
      await base44.auth.redirectToLogin();
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl"
            style={{ maxHeight: '90vh' }}
          >
            <div className="p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center"
              >
                <X className="w-6 h-6 text-slate-900" />
              </button>

              {/* Title */}
              <h2 className="text-2xl font-semibold text-center text-slate-900 mb-8 mt-2">
                Sign in
              </h2>

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50 text-base"
                  required
                />

                {/* Password */}
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 text-base pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-slate-900 underline"
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white text-base font-medium rounded-full mt-6"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-sm text-slate-500">OR CONTINUE WITH</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Social Sign In */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full h-14 bg-white hover:bg-slate-50 border-slate-200 text-slate-900 text-base font-medium rounded-full flex items-center justify-center gap-2"
                >
                  <Apple className="w-5 h-5 fill-current" />
                  Sign in with Apple
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full h-14 bg-white hover:bg-slate-50 border-slate-200 text-slate-900 text-base font-medium rounded-full flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </Button>
              </div>

              {/* Bottom Spacing */}
              <div className="h-6" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}