import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin-only or system function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all pending referrals (status = 'pending')
    const pendingReferrals = await base44.asServiceRole.entities.Referral.filter({
      status: 'pending'
    });

    const results = [];
    const errors = [];

    for (const referral of pendingReferrals) {
      try {
        // Get referee (user who was referred)
        let referee = null;
        try {
          const users = await base44.asServiceRole.entities.User.list();
          referee = users.find(u => u.id === referral.referee_id);
        } catch (error) {
          console.error('Failed to fetch referee:', error);
          continue;
        }

        if (!referee) {
          errors.push({
            referral_id: referral.id,
            error: 'Referee not found'
          });
          continue;
        }

        // Check if referee completed signup (onboarding completed)
        if (!referee.onboarding_completed) {
          continue; // Skip - not ready for reward yet
        }

        // Get campaign details
        const campaigns = await base44.asServiceRole.entities.CampaignReferral.filter({
          code: referral.referral_code
        });

        const campaign = campaigns[0];
        if (!campaign || !campaign.is_active) {
          errors.push({
            referral_id: referral.id,
            error: 'Campaign not found or inactive'
          });
          continue;
        }

        // Check if campaign has reward configured
        if (!campaign.referral_reward_amount || campaign.referral_reward_amount <= 0) {
          // No reward for this campaign
          await base44.asServiceRole.entities.Referral.update(referral.id, {
            status: 'completed'
          });
          results.push({
            referral_id: referral.id,
            status: 'completed',
            reason: 'No reward configured'
          });
          continue;
        }

        // Get referrer (user who made the referral)
        let referrer = null;
        try {
          const users = await base44.asServiceRole.entities.User.list();
          referrer = users.find(u => u.id === referral.referrer_id);
        } catch (error) {
          console.error('Failed to fetch referrer:', error);
          continue;
        }

        if (!referrer) {
          errors.push({
            referral_id: referral.id,
            error: 'Referrer not found'
          });
          continue;
        }

        // Get referrer's current wallet transactions to calculate balance
        const transactions = await base44.asServiceRole.entities.WalletTransaction.filter({
          user_id: referral.referrer_id
        });

        const currentBalance = transactions.length > 0 
          ? transactions[transactions.length - 1].balance_after 
          : 0;

        const newBalance = currentBalance + campaign.referral_reward_amount;

        // Create wallet transaction
        const transaction = await base44.asServiceRole.entities.WalletTransaction.create({
          user_id: referral.referrer_id,
          transaction_type: 'referral_bonus',
          amount: campaign.referral_reward_amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: referral.id,
          reference_type: 'Referral',
          description: `Referral reward from ${referee.display_name || referee.full_name}`,
          status: 'completed'
        });

        // Send notification to referrer
        await base44.asServiceRole.entities.Notification.create({
          user_id: referral.referrer_id,
          type: 'payment_received',
          title: 'Referral Reward Received',
          message: `You received ₹${campaign.referral_reward_amount} for referring ${referee.display_name || referee.full_name}`,
          amount: campaign.referral_reward_amount,
          action_url: '/wallet'
        });

        // Mark referral as rewarded
        await base44.asServiceRole.entities.Referral.update(referral.id, {
          status: 'rewarded',
          rewarded_date: new Date().toISOString()
        });

        results.push({
          referral_id: referral.id,
          referrer_id: referral.referrer_id,
          referee_id: referral.referee_id,
          amount: campaign.referral_reward_amount,
          status: 'rewarded'
        });

      } catch (error) {
        console.error('Error processing referral:', error);
        errors.push({
          referral_id: referral.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${pendingReferrals.length} referrals`,
      rewarded_count: results.length,
      error_count: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Error in distributeReferralRewards:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});