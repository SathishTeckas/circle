import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Upload, X } from 'lucide-react';

export default function RaiseDispute() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const results = await base44.entities.Booking.filter({ id: bookingId });
      return results[0];
    },
    enabled: !!bookingId
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setEvidenceFiles([...evidenceFiles, ...urls]);
    } catch (error) {
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index));
  };

  const submitDisputeMutation = useMutation({
    mutationFn: async () => {
      const isSeeker = user.id === booking.seeker_id;
      
      // Create dispute
      await base44.entities.Dispute.create({
        booking_id: bookingId,
        raised_by: user.id,
        raised_by_name: user.full_name,
        raised_by_role: isSeeker ? 'seeker' : 'companion',
        against_user_id: isSeeker ? booking.companion_id : booking.seeker_id,
        against_user_name: isSeeker ? booking.companion_name : booking.seeker_name,
        reason: reason,
        description: description,
        evidence_urls: evidenceFiles,
        status: 'open'
      });

      // Update booking status
      await base44.entities.Booking.update(bookingId, {
        status: 'disputed'
      });

      // Notify admin
      const admins = await base44.entities.User.filter({ user_role: 'admin' });
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          type: 'booking_reminder',
          title: '⚠️ New Dispute',
          message: `${user.full_name} raised a dispute for booking ${bookingId.slice(0, 8)}`,
          booking_id: bookingId,
          action_url: createPageUrl('AdminDisputes')
        });
      }

      // Notify other party
      const otherUserId = isSeeker ? booking.companion_id : booking.seeker_id;
      await base44.entities.Notification.create({
        user_id: otherUserId,
        type: 'booking_reminder',
        title: '⚠️ Dispute Raised',
        message: `A dispute has been raised for your booking. Our team will review it shortly.`,
        booking_id: bookingId,
        action_url: createPageUrl(`BookingView?id=${bookingId}`)
      });
    },
    onSuccess: () => {
      window.location.href = createPageUrl(`BookingView?id=${bookingId}`);
    }
  });

  const canSubmit = reason && description.trim().length > 20;

  if (!booking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

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
          <h1 className="font-bold" style={{ color: '#2D3436' }}>Raise Dispute</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Before You Continue</h3>
              <p className="text-sm text-amber-700">
                Raising a dispute will notify our support team. Please provide accurate details and evidence to help us resolve the issue fairly.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <Label className="mb-2 block">Dispute Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="misconduct">Misconduct or Inappropriate Behavior</SelectItem>
                <SelectItem value="payment_issue">Payment Issue</SelectItem>
                <SelectItem value="safety_concern">Safety Concern</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Description *</Label>
            <Textarea
              placeholder="Please provide detailed information about the issue (minimum 20 characters)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl min-h-32"
            />
            <p className="text-xs text-slate-500 mt-1">
              {description.length} / 20 characters minimum
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Evidence (Optional)</Label>
            <p className="text-xs text-slate-500 mb-2">
              Upload photos, screenshots, or documents to support your claim
            </p>
            
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="evidence-upload"
            />
            
            <label htmlFor="evidence-upload">
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 rounded-xl"
                disabled={uploading}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </span>
              </Button>
            </label>

            {evidenceFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {evidenceFiles.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <img 
                      src={url} 
                      alt={`Evidence ${idx + 1}`}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <span className="text-sm text-slate-600 flex-1 truncate">
                      Evidence {idx + 1}
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => submitDisputeMutation.mutate()}
            disabled={!canSubmit || submitDisputeMutation.isPending}
            className="w-full h-14 rounded-xl font-bold"
            style={{ background: '#E17055', color: '#FFFFFF' }}
          >
            {submitDisputeMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </Card>
      </div>
    </div>
  );
}