import React, { useState } from 'react';
import { ArrowLeft, Phone, Mail, MessageCircle, HelpCircle, ChevronRight, Clock, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpSupport() {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const faqs = [
    {
      question: "How do I book a companion?",
      answer: "Browse available companions on the Discover page, select a time slot that works for you, choose your preferred duration, and proceed to payment. Once confirmed, you can chat with your companion to plan the meetup details."
    },
    {
      question: "How does payment work?",
      answer: "All payments are held securely in escrow when you book. The companion receives payment only after the meetup is successfully completed. If cancelled with proper notice, refunds are processed according to our cancellation policy."
    },
    {
      question: "What's the cancellation policy?",
      answer: "Full refund for cancellations 24+ hours before meetup, 50% refund for 6-24 hours notice, 25% for 3-6 hours notice, and no refund for less than 3 hours notice. Companions cancelling confirmed bookings may face reliability score impacts."
    },
    {
      question: "How are companions verified?",
      answer: "All companions undergo KYC verification including ID proof, selfie verification, and background checks. We verify identity documents and ensure all safety requirements are met before approval."
    },
    {
      question: "Is my personal information safe?",
      answer: "Yes, we use industry-standard encryption to protect your data. Your payment information is never stored on our servers. We only share essential information with matched users to facilitate meetups."
    },
    {
      question: "What if I feel unsafe during a meetup?",
      answer: "Your safety is our priority. Always meet in public verified venues. If you feel unsafe, you can leave immediately. Contact our 24/7 safety helpline at +91 9876543210 for immediate assistance."
    },
    {
      question: "How do I become a companion?",
      answer: "Complete the registration process, select 'Companion' as your role, submit KYC documents for verification, and set your availability. Once approved, you can start accepting bookings."
    },
    {
      question: "What happens if someone doesn't show up?",
      answer: "Report a no-show through the booking page. Our team reviews the case and handles refunds or payouts accordingly. Repeated no-shows result in account suspension."
    }
  ];

  const contactOptions = [
    {
      icon: Phone,
      title: "General Helpline",
      value: "+91 9876543210",
      subtitle: "24/7 Available",
      action: "tel:+919876543210"
    },
    {
      icon: Mail,
      title: "Email Support",
      value: "support@circle.com",
      subtitle: "Response within 24 hours",
      action: "mailto:support@circle.com"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Support",
      value: "+91 9876543210",
      subtitle: "Quick responses",
      action: "https://wa.me/919876543210"
    }
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#FFF3B8' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#2D3436' }} />
          </button>
          <h1 className="text-xl font-extrabold" style={{ color: '#2D3436' }}>Help & Support</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Quick Contact Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Contact Us</h2>
          {contactOptions.map((option, idx) => (
            <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
              <a 
                href={option.action}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <option.icon className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{option.title}</p>
                  <p className="text-sm text-violet-600">{option.value}</p>
                  <p className="text-xs text-slate-500">{option.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </a>
            </Card>
          ))}
        </div>

        {/* Support Hours */}
        <Card className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Support Hours</p>
              <p className="text-xs text-slate-600">Emergency helpline: 24/7 • Email support: Mon-Sun, 9 AM - 9 PM</p>
            </div>
          </div>
        </Card>

        {/* Quick Query Form */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Send us a message</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Subject</label>
              <Input
                placeholder="How can we help?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Message</label>
              <Textarea
                placeholder="Describe your issue or question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-xl h-32"
              />
            </div>
            <Button className="w-full rounded-xl font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </Card>

        {/* FAQs */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
            Frequently Asked Questions
          </h2>
          <Card className="overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-slate-100 last:border-0">
                  <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 text-left">
                    <span className="text-sm font-medium text-slate-900">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

        {/* Additional Resources */}
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Need More Help?</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <span className="text-sm text-slate-700">Community Guidelines</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <span className="text-sm text-slate-700">Safety Tips</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <span className="text-sm text-slate-700">Report an Issue</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}