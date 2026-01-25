import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin-only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { referee_id, campaign_code } = body;

    if (!referee_id || !campaign_code) {
      return Response.json({ error: 'referee_id and campaign_code required' }, { status: 400 });
    }

    // Get campaign details
    const campaigns = await base44.asServiceRole.entities.CampaignReferral.filter({ code: campaign_code });
    if (campaigns.length === 0) {
      return Response.json({ error: `Campaign ${campaign_code} not found` }, { status: 404 });
    }

    const campaign = campaigns[0];

    // Skip if no reward configured
    if (!campaign.referral_reward_amount || campaign.referral_reward_type !== 'wallet_credit') {
      return Response.json({ error: 'Campaign has no wallet credit reward configured' }, { status: 400 });
    }

    // Check if already processed
    const existingReferrals = await base44.asServiceRole.entities.Referral.filter({
      referee_id: referee_id,
      referral_code: campaign_code,
      referral_type: 'campaign_signup'
    });

    if (existingReferrals.length > 0 && existingReferrals[0].status === 'rewarded') {
      return Response.json({ error: 'User already received this reward' }, { status: 400 });
    }

    // Create or update referral record
    let referral;
    if (existingReferrals.length === 0) {
      referral = await base44.asServiceRole.entities.Referral.create({
        referrer_id: campaign.id,
        referrer_name: campaign.campaign_name,
        referee_id: referee_id,
        referee_name: 'Campaign Signup',
        referral_code: campaign_code,
        referral_type: 'campaign_signup',
        status: 'completed',
        reward_amount: campaign.referral_reward_amount
      });
    } else {
      referral = existingReferrals[0];
    }

    // Get current wallet balance
    const referee = await base44.asServiceRole.entities.User.get(referee_id);
    const currentBalance = referee.wallet_balance || 0;
    const newBalance = currentBalance + campaign.referral_reward_amount;

    // Update wallet balance
    await base44.asServiceRole.entities.User.update(referee_id, {
      wallet_balance: newBalance
    });

    // Log transaction
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: referee_id,
      transaction_type: 'campaign_bonus',
      amount: campaign.referral_reward_amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: referral.id,
      reference_type: 'Referral',
      description: `Campaign signup bonus for ${campaign_code}`,
      status: 'completed'
    });

    // Mark referral as rewarded
    if (existingReferrals.length > 0) {
      await base44.asServiceRole.entities.Referral.update(referral.id, {
        status: 'rewarded'
      });
    }

    // Send notification
    await base44.asServiceRole.entities.Notification.create({
      user_id: referee_id,
      type: 'referral_bonus',
      title: '🎉 Campaign Signup Bonus!',
      message: `You received ₹${campaign.referral_reward_amount} for signing up with code ${campaign_code}!`,
      amount: campaign.referral_reward_amount,
      read: false
    });

    return Response.json({
      success: true,
      message: `Rewarded user ${referee_id} with ₹${campaign.referral_reward_amount} for campaign ${campaign_code}`,
      amount: campaign.referral_reward_amount,
      referral_id: referral.id
    });
  } catch (error) {
    console.error('Error in manuallyRewardCampaignUser:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});