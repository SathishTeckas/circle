import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, AlertCircle, CheckCircle, Phone, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PrivacySafety() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Privacy & Safety</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Safety First Banner */}
        <Card className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Your Safety Matters</h2>
              <p className="text-sm text-slate-600">We prioritize your security and privacy</p>
            </div>
          </div>
        </Card>

        {/* Privacy Policy */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-violet-600" />
            <h2 className="text-lg font-bold text-slate-900">Privacy Policy</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Information We Collect</h3>
              <p className="leading-relaxed">
                We collect information you provide during registration including your name, email, phone number, 
                profile photos, and preferences. Location data is collected only when you use location-based features.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">How We Use Your Information</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>To facilitate connections between seekers and companions</li>
                <li>To process payments and maintain transaction records</li>
                <li>To verify identity and ensure platform safety</li>
                <li>To send important notifications about your bookings</li>
                <li>To improve our services and user experience</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Data Protection</h3>
              <p className="leading-relaxed">
                Your personal information is encrypted and stored securely. We implement industry-standard 
                security measures to protect against unauthorized access, alteration, or disclosure.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Information Sharing</h3>
              <p className="leading-relaxed">
                We only share your information with matched users for the purpose of facilitating meetups. 
                We never sell your personal data to third parties. Payment information is securely processed 
                through encrypted payment gateways.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Your Rights</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Access and review your personal data anytime</li>
                <li>Request correction of inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Opt-out of non-essential communications</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Cookies & Tracking</h3>
              <p className="leading-relaxed">
                We use cookies to enhance your experience and analyze platform usage. You can manage 
                cookie preferences through your browser settings.
              </p>
            </div>
          </div>
        </Card>

        {/* Safety Guidelines */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Safety Guidelines</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Meet in Public Places</h3>
                <p className="text-sm text-slate-600">
                  Always choose verified venues with CCTV coverage for your first meetup. We recommend 
                  restaurants, cafes, or other public spaces.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Verify Identity</h3>
                <p className="text-sm text-slate-600">
                  All companions go through KYC verification. Check profile badges and reviews before booking.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Share Your Plans</h3>
                <p className="text-sm text-slate-600">
                  Let a trusted friend or family member know about your meetup details including time, 
                  location, and companion information.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Trust Your Instincts</h3>
                <p className="text-sm text-slate-600">
                  If something feels off, it's okay to cancel or leave. Your safety is the priority.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Use In-App Communication</h3>
                <p className="text-sm text-slate-600">
                  Keep all communication within the app chat until you feel comfortable. Never share 
                  personal contact details prematurely.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Payment Protection</h3>
                <p className="text-sm text-slate-600">
                  All payments are held in escrow until the meetup is completed. Never arrange payment 
                  outside the platform.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Report & Block */}
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">Report Concerns</h2>
          </div>
          
          <p className="text-sm text-slate-700 mb-4">
            If you experience any inappropriate behavior, harassment, or safety concerns, please report 
            immediately. Our team investigates all reports within 24 hours.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-red-600" />
              <span className="font-medium">Emergency Helpline:</span>
              <span>+91 9876543210</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-4 h-4 text-red-600" />
              <span className="font-medium">Safety Team:</span>
              <span>safety@circle.com</span>
            </div>
          </div>
        </Card>

        {/* Data Retention */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Data Retention</h2>
          </div>
          
          <div className="space-y-3 text-sm text-slate-700">
            <p className="leading-relaxed">
              We retain your account information as long as your account is active. After account deletion, 
              personal data is removed within 30 days, except for:
            </p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Transaction records (required for legal compliance)</li>
              <li>Safety incident reports</li>
              <li>Communications related to disputes</li>
            </ul>
            <p className="leading-relaxed">
              Data retention for legal purposes is limited to what's required by applicable laws.
            </p>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-6 bg-slate-50">
          <h3 className="font-semibold text-slate-900 mb-2">Questions About Privacy?</h3>
          <p className="text-sm text-slate-600 mb-4">
            For privacy-related inquiries or to exercise your data rights, contact our privacy team.
          </p>
          <Button variant="outline" className="w-full rounded-xl">
            Contact Privacy Team
          </Button>
        </Card>

        <p className="text-xs text-slate-500 text-center">
          Last updated: January 2026
        </p>
      </div>
    </div>
  );
}