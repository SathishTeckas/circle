import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active campaigns
    const campaigns = await base44.asServiceRole.entities.CampaignReferral.filter({ is_active: true });
    if (campaigns.length === 0) {
      return Response.json({ message: 'No active campaigns found' }, { status: 200 });
    }

    let processedCount = 0;

    // For each campaign, check for referrals that haven't been rewarded yet
    for (const campaign of campaigns) {
      const allReferrals = await base44.asServiceRole.entities.Referral.filter({
        referral_code: campaign.code,
        referral_type: 'campaign_signup'
      }, '-created_date', 1000);

      for (const referral of allReferrals) {
        // Check if reward has already been applied (status is 'rewarded')
        if (referral.status === 'rewarded') {
          continue;
        }

        // Skip if no reward configured
        if (campaign.referral_reward_amount === 0 || campaign.referral_reward_type !== 'wallet_credit') {
          continue;
        }

        try {
          // Fetch user (use referee_id as the signup user)
          const signupUser = await base44.asServiceRole.entities.User.get(referral.referee_id);
          if (!signupUser) {
            console.error(`User ${referral.referee_id} not found`);
            continue;
          }

          // Get current balance
          const oldBalance = signupUser.wallet_balance || 0;
          const newBalance = oldBalance + campaign.referral_reward_amount;

          // Update wallet balance
          await base44.asServiceRole.entities.User.update(referral.referee_id, {
            wallet_balance: newBalance
          });

          // Log transaction
          await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: referral.referee_id,
            transaction_type: 'campaign_bonus',
            amount: campaign.referral_reward_amount,
            balance_before: oldBalance,
            balance_after: newBalance,
            reference_id: referral.id,
            reference_type: 'Referral',
            description: `Campaign signup bonus for ${campaign.code}`,
            status: 'completed'
          });

          // Mark referral as rewarded
          await base44.asServiceRole.entities.Referral.update(referral.id, {
            status: 'rewarded'
          });

          // Send notification
          await base44.asServiceRole.entities.Notification.create({
            user_id: referral.referee_id,
            type: 'referral_bonus',
            title: '🎉 Campaign Signup Bonus!',
            message: `You received ₹${campaign.referral_reward_amount} for signing up with code ${campaign.code}!`,
            amount: campaign.referral_reward_amount,
            read: false
          });

          processedCount++;
        } catch (err) {
          console.error(`Failed to process reward for referral ${referral.id}:`, err.message);
        }
      }
    }

    return Response.json({ 
      message: `Processed ${processedCount} pending campaign rewards`,
      processedCount 
    });
  } catch (error) {
    console.error('Error in processPendingCampaignReferrals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});