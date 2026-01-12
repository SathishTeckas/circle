import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function FlagReviewButton({ review, booking, currentUser }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const flagMutation = useMutation({
    mutationFn: async () => {
      // Check if already flagged
      const existing = await base44.entities.FlaggedReview.filter({
        review_id: review.id,
        flagged_by: currentUser.id
      });

      if (existing.length > 0) {
        throw new Error('You have already flagged this review');
      }

      // Create flagged review
      await base44.entities.FlaggedReview.create({
        review_id: review.id,
        booking_id: booking?.id || review.booking_id,
        flagged_by: currentUser.id,
        flagged_by_name: currentUser.display_name || currentUser.full_name,
        reviewer_id: review.reviewer_id,
        reviewer_name: review.reviewer_name,
        review_content: review.comment || '',
        review_rating: review.rating,
        reason,
        description,
        status: 'pending'
      });

      // Notify admins
      const admins = await base44.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          type: 'review_received',
          title: 'Review Flagged for Moderation',
          message: `${currentUser.display_name || currentUser.full_name} flagged a review for ${reason}`,
          booking_id: booking?.id || review.booking_id,
          action_url: `/AdminFlaggedReviews`
        });
      }
    },
    onSuccess: () => {
      toast.success('Review flagged for moderation');
      setOpen(false);
      setReason('');
      setDescription('');
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to flag review');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    flagMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
          <Flag className="w-4 h-4 mr-1" />
          Flag
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Flag Review</DialogTitle>
          <DialogDescription>
            Report this review if you believe it's unfair or inaccurate. Our team will review it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inaccurate">Inaccurate Information</SelectItem>
                <SelectItem value="offensive">Offensive Content</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Explanation</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain why you're flagging this review..."
              className="mt-1 h-24"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={flagMutation.isPending}>
              {flagMutation.isPending ? 'Submitting...' : 'Submit Flag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}