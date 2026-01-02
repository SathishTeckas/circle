import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, DollarSign, Clock, Shield, Bell, ArrowLeft,
  Save, AlertTriangle
} from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platform_fee: 15,
    request_timeout_minutes: 30,
    no_show_penalty_percent: 100,
    min_booking_hours: 1,
    max_booking_hours: 4,
    require_cctv_venues: false,
    auto_refund_on_rejection: true,
    review_delay_hours: 3
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // In production, this would save to a settings entity
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Platform Settings</h1>
              <p className="text-sm text-slate-600">Configure platform behavior</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Financial Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
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
                onChange={(e) => setSettings({ ...settings, platform_fee: parseInt(e.target.value) })}
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
                onChange={(e) => setSettings({ ...settings, no_show_penalty_percent: parseInt(e.target.value) })}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Percentage of booking amount charged for no-shows
              </p>
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
                onChange={(e) => setSettings({ ...settings, request_timeout_minutes: parseInt(e.target.value) })}
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
                  onChange={(e) => setSettings({ ...settings, min_booking_hours: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max Booking Hours</Label>
                <Input
                  type="number"
                  value={settings.max_booking_hours}
                  onChange={(e) => setSettings({ ...settings, max_booking_hours: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Review Delay (hours)</Label>
              <Input
                type="number"
                value={settings.review_delay_hours}
                onChange={(e) => setSettings({ ...settings, review_delay_hours: parseInt(e.target.value) })}
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
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-violet-600 hover:bg-violet-700 rounded-xl text-lg"
        >
          {saving ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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