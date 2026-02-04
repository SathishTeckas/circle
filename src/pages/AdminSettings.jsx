import React, { useState, useEffect, useTransition } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, IndianRupee, Clock, Shield, Bell, ArrowLeft,
  Save, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [settings, setSettings] = useState({
    platform_fee: 15,
    request_timeout_minutes: 30,
    no_show_penalty_percent: 100,
    min_booking_hours: 1,
    max_booking_hours: 4,
    require_cctv_venues: false,
    auto_refund_on_rejection: true,
    review_delay_hours: 3,
    cancellation_platform_split: 30,
    cancellation_companion_split: 20
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      if (user.user_role !== 'admin' && user.role !== 'admin') {
        window.location.href = createPageUrl('Discover');
      }
    };
    checkAdmin();
  }, []);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const results = await base44.entities.AppSettings.list('', 1);
      return results[0];
    }
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (savedSettings?.id) {
        await base44.entities.AppSettings.update(savedSettings.id, settings);
      } else {
        await base44.entities.AppSettings.create(settings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
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
              <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>Platform Settings</h1>
              <p className="text-sm" style={{ color: '#636E72' }}>Configure platform behavior</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* Financial Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Financial Settings</h2>
              <p className="text-sm text-slate-600">Manage fees and payouts</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Platform Fee (%)</Label>
              <Input
                type="number"
                value={settings.platform_fee}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  startTransition(() => {
                    setSettings({ ...settings, platform_fee: value });
                  });
                }}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Percentage charged on each booking
              </p>
            </div>

            <div>
              <Label>No-Show Penalty (%)</Label>
              <Input
                type="number"
                value={settings.no_show_penalty_percent}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  startTransition(() => {
                    setSettings({ ...settings, no_show_penalty_percent: value });
                  });
                }}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Percentage of booking amount charged for no-shows
              </p>
            </div>

            {/* Cancellation Split Settings */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="font-medium text-slate-900 mb-3">Cancellation Split (Non-Refunded Amount)</h3>
              <p className="text-sm text-slate-600 mb-4">
                When a booking is cancelled and only partial refund is given, configure how the non-refunded amount is split.
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <Label>Platform Share (%)</Label>
                  <Input
                    type="number"
                    value={settings.cancellation_platform_split}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      startTransition(() => {
                        setSettings({ ...settings, cancellation_platform_split: value });
                      });
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Platform's share of retained amount
                  </p>
                </div>
                <div>
                  <Label>Companion Share (%)</Label>
                  <Input
                    type="number"
                    value={settings.cancellation_companion_split}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      startTransition(() => {
                        setSettings({ ...settings, cancellation_companion_split: value });
                      });
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Companion's share of retained amount
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Example:</strong> Base price ₹1000, platform fee 7% (₹70), seeker paid ₹1070 total.
                  <br />Seeker cancels 6-24 hours before → 50% of base price refunded.
                  <br />
                  <br />• <strong>Refund to seeker:</strong> 50% of ₹1000 = ₹500 (platform fee ₹70 never refunded)
                  <br />• <strong>Retained from base price:</strong> ₹1000 - ₹500 = ₹500
                  <br />• <strong>Companion gets:</strong> {settings.cancellation_companion_split}% of ₹500 = ₹{Math.round(500 * (settings.cancellation_companion_split || 20) / 100)}
                  <br />• <strong>Platform gets:</strong> ₹70 (fee) + remaining ₹{500 - Math.round(500 * (settings.cancellation_companion_split || 20) / 100)} = ₹{70 + 500 - Math.round(500 * (settings.cancellation_companion_split || 20) / 100)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Timing Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Timing Settings</h2>
              <p className="text-sm text-slate-600">Configure timeouts and durations</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Request Timeout (minutes)</Label>
              <Input
                type="number"
                value={settings.request_timeout_minutes}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  startTransition(() => {
                    setSettings({ ...settings, request_timeout_minutes: value });
                  });
                }}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Time companions have to accept/reject requests
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <Label>Min Booking Hours</Label>
                <Input
                  type="number"
                  value={settings.min_booking_hours}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    startTransition(() => {
                      setSettings({ ...settings, min_booking_hours: value });
                    });
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max Booking Hours</Label>
                <Input
                  type="number"
                  value={settings.max_booking_hours}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    startTransition(() => {
                      setSettings({ ...settings, max_booking_hours: value });
                    });
                  }}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Review Delay (hours)</Label>
              <Input
                type="number"
                value={settings.review_delay_hours}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  startTransition(() => {
                    setSettings({ ...settings, review_delay_hours: value });
                  });
                }}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Hours after meetup before review prompts are sent
              </p>
            </div>
          </div>
        </Card>

        {/* Safety Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Safety Settings</h2>
              <p className="text-sm text-slate-600">Configure safety requirements</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">Require CCTV Venues</p>
                <p className="text-sm text-slate-600">Only allow bookings at venues with CCTV</p>
              </div>
              <Switch
                checked={settings.require_cctv_venues}
                onCheckedChange={(checked) => setSettings({ ...settings, require_cctv_venues: checked })}
                className="data-[state=checked]:bg-violet-600"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">Auto-Refund on Rejection</p>
                <p className="text-sm text-slate-600">Automatically refund when companion declines</p>
              </div>
              <Switch
                checked={settings.auto_refund_on_rejection}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_refund_on_rejection: checked })}
                className="data-[state=checked]:bg-violet-600"
              />
            </div>
          </div>
        </Card>

        {/* Warning */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Important</p>
              <p className="text-sm text-amber-700 mt-1">
                Changes to these settings will affect all new bookings. Existing bookings will not be affected.
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="w-full h-14 rounded-xl text-lg font-bold"
          style={{ background: '#FFD93D', color: '#2D3436' }}
        >
          {saveMutation.isPending ? (
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2D3436', borderTopColor: 'transparent' }} />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}