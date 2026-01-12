import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Flag, CheckCircle, XCircle, Trash2, Mail, Star } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminFlaggedReviews() {
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: flaggedReviews = [], isLoading } = useQuery({
    queryKey: ['flaggedReviews'],
    queryFn: () => base44.entities.FlaggedReview.list('-created_date')
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ flagId, status, removeReview }) => {
      const flag = flaggedReviews.find(f => f.id === flagId);
      
      // Update flag status
      await base44.entities.FlaggedReview.update(flagId, {
        status,
        admin_notes: adminNotes,
        resolved_by: user.id,
        resolved_date: new Date().toISOString()
      });

      // If review should be removed, delete it
      if (removeReview) {
        await base44.entities.Review.delete(flag.review_id);
        
        // Notify the companion
        await base44.entities.Notification.create({
          user_id: flag.flagged_by,
          type: 'review_received',
          title: 'Review Removed',
          message: 'A review you flagged has been removed by our moderation team.',
          booking_id: flag.booking_id
        });
      }

      // Notify the person who flagged
      await base44.entities.Notification.create({
        user_id: flag.flagged_by,
        type: 'review_received',
        title: 'Flag Resolution',
        message: `Your flagged review has been ${status === 'approved' ? 'approved and removed' : status === 'rejected' ? 'reviewed and kept' : 'processed'}.`,
        booking_id: flag.booking_id
      });

      // If contacting reviewer, notify them too
      if (status === 'reviewer_contacted') {
        await base44.entities.Notification.create({
          user_id: flag.reviewer_id,
          type: 'review_received',
          title: 'Review Feedback',
          message: 'Our team has reviewed your recent review. Please check your email for more details.',
          booking_id: flag.booking_id
        });
      }
    },
    onSuccess: () => {
      toast.success('Flag resolved successfully');
      setActionDialog(null);
      setSelectedFlag(null);
      setAdminNotes('');
      queryClient.invalidateQueries(['flaggedReviews']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resolve flag');
    }
  });

  const handleAction = (action) => {
    const actions = {
      approve: { status: 'review_removed', removeReview: true },
      reject: { status: 'rejected', removeReview: false },
      contact: { status: 'reviewer_contacted', removeReview: false }
    };

    updateFlagMutation.mutate({
      flagId: selectedFlag.id,
      ...actions[action]
    });
  };

  const pendingFlags = flaggedReviews.filter(f => f.status === 'pending');
  const resolvedFlags = flaggedReviews.filter(f => f.status !== 'pending');

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    review_removed: { label: 'Review Removed', color: 'bg-purple-100 text-purple-800' },
    reviewer_contacted: { label: 'Reviewer Contacted', color: 'bg-blue-100 text-blue-800' }
  };

  const reasonLabels = {
    inaccurate: 'Inaccurate Information',
    offensive: 'Offensive Content',
    spam: 'Spam',
    inappropriate: 'Inappropriate',
    other: 'Other'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Flagged Reviews</h1>
          <p className="text-slate-600 mt-1">Review and moderate flagged reviews from the community</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingFlags.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedFlags.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingFlags.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No pending flagged reviews</p>
                </CardContent>
              </Card>
            ) : (
              pendingFlags.map((flag) => (
                <Card key={flag.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          Flagged by {flag.flagged_by_name}
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                          Review by {flag.reviewer_name} • {format(new Date(flag.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className={statusConfig[flag.status].color}>
                        {statusConfig[flag.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-slate-500">Original Review</Label>
                      <div className="mt-1 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= flag.review_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-slate-700">{flag.review_content || 'No comment'}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-500">Reason for Flagging</Label>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {reasonLabels[flag.reason]}
                      </p>
                      {flag.description && (
                        <p className="text-sm text-slate-600 mt-1">{flag.description}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFlag(flag);
                          setActionDialog('approve');
                        }}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFlag(flag);
                          setActionDialog('reject');
                        }}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Keep Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFlag(flag);
                          setActionDialog('contact');
                        }}
                        className="flex-1"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Reviewer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {resolvedFlags.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No resolved flags yet</p>
                </CardContent>
              </Card>
            ) : (
              resolvedFlags.map((flag) => (
                <Card key={flag.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          Flagged by {flag.flagged_by_name}
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                          Review by {flag.reviewer_name} • Resolved {format(new Date(flag.resolved_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className={statusConfig[flag.status].color}>
                        {statusConfig[flag.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500">Reason</Label>
                      <p className="text-sm text-slate-900">{reasonLabels[flag.reason]}</p>
                    </div>
                    {flag.admin_notes && (
                      <div>
                        <Label className="text-xs text-slate-500">Admin Notes</Label>
                        <p className="text-sm text-slate-700">{flag.admin_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Confirmation Dialog */}
      {actionDialog && selectedFlag && (
        <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog === 'approve' && 'Remove Review'}
                {actionDialog === 'reject' && 'Keep Review'}
                {actionDialog === 'contact' && 'Contact Reviewer'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog === 'approve' && 'This will permanently remove the review from the platform.'}
                {actionDialog === 'reject' && 'This will keep the review and mark the flag as rejected.'}
                {actionDialog === 'contact' && 'This will notify the reviewer to discuss the review.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-1 h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleAction(actionDialog)}
                disabled={updateFlagMutation.isPending}
              >
                {updateFlagMutation.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}