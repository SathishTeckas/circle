import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_id: userId, data: userData, event } = await req.json();

    if (event?.type !== 'create') {
      return Response.json({ message: 'Skipping non-create event' }, { status: 200 });
    }

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await base44.asServiceRole.entities.User.get(userId);
    
    if (!user || !user.campaign_referral_code) {
      return Response.json({ message: 'No campaign code found' }, { status: 200 });
    }

    const campaignCode = user.campaign_referral_code;
    const campaigns = await base44.asServiceRole.entities.CampaignReferral.filter({ code: campaignCode });

    if (campaigns.length === 0) {
      console.warn(`Campaign ${campaignCode} not found for user ${userId}`);
      return Response.json({ message: 'Campaign not found' }, { status: 200 });
    }

    const campaign = campaigns[0];

    // Check if campaign is active
    if (!campaign.is_active) {
      return Response.json({ message: 'Campaign is not active', status: 200 });
    }

    // Check for duplicate campaign referral to prevent double rewards
    const existingCampaignReferral = await base44.asServiceRole.entities.Referral.filter({
      referee_id: userId,
      referral_code: campaignCode
    });

    if (existingCampaignReferral.length > 0) {
      return Response.json({ message: 'Campaign reward already applied', status: 200 });
    }

    const updatedStats = {
      total_signups: (campaign.total_signups || 0) + 1,
      total_companions: campaign.total_companions || 0,
      total_seekers: campaign.total_seekers || 0,
    };

    if (user.user_role === 'companion') {
      updatedStats.total_companions += 1;
    } else if (user.user_role === 'seeker') {
      updatedStats.total_seekers += 1;
    }

    await base44.asServiceRole.entities.CampaignReferral.update(campaign.id, updatedStats);

    // Create Referral record for campaign signup reward
    if (campaign.referral_reward_amount > 0 && campaign.referral_reward_type === 'wallet_credit') {
      const campaignReferral = await base44.asServiceRole.entities.Referral.create({
        referrer_id: userId,
        referrer_name: user.display_name || user.full_name,
        referee_id: userId,
        referee_name: 'Campaign Signup',
        referral_code: campaignCode,
        referral_type: 'campaign_signup',
        status: 'completed',
        reward_amount: campaign.referral_reward_amount,
        rewarded_date: new Date().toISOString()
      });

      // Update wallet balance
      const newBalance = (user.wallet_balance || 0) + campaign.referral_reward_amount;
      await base44.asServiceRole.entities.User.update(userId, {
        wallet_balance: newBalance
      });

      // Log transaction
      await base44.asServiceRole.entities.WalletTransaction.create({
        user_id: userId,
        transaction_type: 'campaign_bonus',
        amount: campaign.referral_reward_amount,
        balance_before: user.wallet_balance || 0,
        balance_after: newBalance,
        reference_id: campaignReferral.id,
        reference_type: 'Referral',
        description: `Campaign signup bonus for ${campaignCode}`
      });

      // Update referral status to rewarded
      await base44.asServiceRole.entities.Referral.update(campaignReferral.id, {
        status: 'rewarded'
      });

      // Send notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: userId,
        type: 'referral_bonus',
        title: '🎉 Campaign Signup Bonus!',
        message: `You received ₹${campaign.referral_reward_amount} for signing up with code ${campaignCode}!`,
        amount: campaign.referral_reward_amount,
        read: false
      });
    }

    return Response.json({ 
      message: `Campaign stats updated for ${campaignCode}`,
      reward_applied: campaign.referral_reward_amount > 0 
    });
  } catch (error) {
    console.error('Error updating campaign stats:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});