import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, MapPin, Ban, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function TermsAcceptance() {
  const [accepted, setAccepted] = useState({
    age: false,
    noEscort: false,
    publicVenue: false,
    terms: false
  });
  const [loading, setLoading] = useState(false);

  const allAccepted = Object.values(accepted).every(Boolean);

  const terms = [
    {
      id: 'age',
      icon: Shield,
      title: 'Age Verification',
      description: 'I confirm that I am 18 years of age or older',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      id: 'noEscort',
      icon: Ban,
      title: 'No Illegal Services',
      description: 'I understand this platform is strictly for companionship and conversation, not escorting or any illegal services',
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    {
      id: 'publicVenue',
      icon: MapPin,
      title: 'Public Venues Only',
      description: 'I agree to conduct all meetups in verified public venues like restaurants and cafes',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'terms',
      icon: Shield,
      title: 'Terms & Privacy',
      description: 'I agree to the Terms of Service and Privacy Policy',
      color: 'text-violet-600',
      bg: 'bg-violet-50'
    }
  ];

  const handleContinue = async () => {
    if (!allAccepted) return;
    
    setLoading(true);
    try {
      await base44.auth.updateMe({ terms_accepted: true });
      window.location.href = createPageUrl('Onboarding');
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Safety First
          </h1>
          <p className="text-slate-600">
            Please review and accept our community guidelines
          </p>
        </motion.div>

        <div className="space-y-4 mb-8">
          {terms.map((term, idx) => (
            <motion.div
              key={term.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all cursor-pointer",
                accepted[term.id]
                  ? "border-violet-500 bg-violet-50/50"
                  : "border-slate-200 bg-white hover:border-violet-200"
              )}
              onClick={() => setAccepted({ ...accepted, [term.id]: !accepted[term.id] })}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  term.bg
                )}>
                  <term.icon className={cn("w-6 h-6", term.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {term.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {term.description}
                      </p>
                    </div>
                    <Checkbox 
                      checked={accepted[term.id]}
                      className="mt-1 border-2 border-slate-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Violation of these terms may result in immediate account suspension and legal action.
          </p>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!allAccepted || loading}
          className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-lg font-semibold rounded-2xl disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              I Agree & Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}