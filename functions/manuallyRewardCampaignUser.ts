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
    const { user_email, campaign_code } = body;

    if (!user_email || !campaign_code) {
      return Response.json({ error: 'user_email and campaign_code required' }, { status: 400 });
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

    // Get the signup user via auth SDK
    const signupUser = await base44.auth.getUserByEmail(user_email);
    if (!signupUser) {
      return Response.json({ error: `User ${user_email} not found` }, { status: 404 });
    }

    // Check if already processed
    const existingReferrals = await base44.asServiceRole.entities.Referral.filter({
      referee_id: signupUser.id,
      referral_code: campaign_code,
      referral_type: 'campaign_signup'
    });

    if (existingReferrals.length > 0 && existingReferrals[0].status === 'rewarded') {
      return Response.json({ error: 'User already received this reward' }, { status: 400 });
    }

    // Create referral record if not exists
    let referral;
    if (existingReferrals.length === 0) {
      referral = await base44.asServiceRole.entities.Referral.create({
        referrer_id: campaign.id,
        referrer_name: campaign.campaign_name,
        referee_id: signupUser.id,
        referee_name: signupUser.full_name || signupUser.email,
        referral_code: campaign_code,
        referral_type: 'campaign_signup',
        status: 'completed',
        reward_amount: campaign.referral_reward_amount
      });
    } else {
      referral = existingReferrals[0];
    }

    // Get current balance
    const oldBalance = signupUser.wallet_balance || 0;
    const newBalance = oldBalance + campaign.referral_reward_amount;

    // Update wallet
    await base44.auth.updateUser(signupUser.id, {
      wallet_balance: newBalance
    });

    // Log transaction
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: signupUser.id,
      transaction_type: 'campaign_bonus',
      amount: campaign.referral_reward_amount,
      balance_before: oldBalance,
      balance_after: newBalance,
      reference_id: referral.id,
      reference_type: 'Referral',
      description: `Campaign signup bonus for ${campaign_code} (Manual)`,
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
      user_id: signupUser.id,
      type: 'referral_bonus',
      title: '🎉 Campaign Signup Bonus!',
      message: `You received ₹${campaign.referral_reward_amount} for signing up with code ${campaign_code}!`,
      amount: campaign.referral_reward_amount,
      read: false
    });

    return Response.json({
      success: true,
      message: `Rewarded ${user_email} with ₹${campaign.referral_reward_amount} for campaign ${campaign_code}`,
      user_id: signupUser.id,
      old_balance: oldBalance,
      new_balance: newBalance,
      amount: campaign.referral_reward_amount
    });
  } catch (error) {
    console.error('Error in manuallyRewardCampaignUser:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});