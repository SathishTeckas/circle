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

    // Apply reward if configured
    if (campaign.referral_reward_amount > 0 && campaign.referral_reward_type === 'wallet_credit') {
      const currentBalance = user.wallet_balance || 0;
      await base44.asServiceRole.entities.User.update(userId, {
        wallet_balance: currentBalance + campaign.referral_reward_amount
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