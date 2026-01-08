import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

export default function BlockUserButton({ userId, userName, isBlocked, className }) {
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      if (isBlocked) {
        // Unblock: find and delete the block record
        const blocks = await base44.entities.BlockedUser.filter({
          blocker_id: currentUser.id,
          blocked_id: userId
        });
        if (blocks[0]) {
          await base44.entities.BlockedUser.delete(blocks[0].id);
        }
      } else {
        // Block: create block record
        await base44.entities.BlockedUser.create({
          blocker_id: currentUser.id,
          blocked_id: userId,
          reason: 'Blocked by user'
        });
      }
    },
    onSuccess: () => {
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    },
    onError: () => {
      toast.error('Failed to update block status');
    }
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={isBlocked ? "outline" : "destructive"}
          className={className}
        >
          {isBlocked ? (
            <>
              <ShieldOff className="w-4 h-4 mr-2" />
              Unblock User
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Block User
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? 'Unblock' : 'Block'} {userName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked 
              ? `You will be able to see ${userName}'s profile and receive messages from them again.`
              : `You won't see ${userName}'s profile in search results and they won't be able to message you. This action can be undone.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => blockMutation.mutate()}
            className={isBlocked ? "bg-violet-600" : "bg-red-600"}
          >
            {blockMutation.isPending ? 'Processing...' : isBlocked ? 'Unblock' : 'Block'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}