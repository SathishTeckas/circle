import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referral_code } = await req.json();

    // If no referral code provided, skip
    if (!referral_code || !referral_code.trim()) {
      return Response.json({ success: true, message: 'No referral code provided' });
    }

    // Get the system referral campaign settings
    const systemCampaigns = await base44.asServiceRole.entities.CampaignReferral.filter({ 
      code: 'SYSTEM' 
    });
    
    let rewardAmount = 100; // Default fallback
    
    if (systemCampaigns.length > 0 && systemCampaigns[0].referral_reward_amount) {
      rewardAmount = systemCampaigns[0].referral_reward_amount;
    } else {
      // Create SYSTEM campaign if it doesn't exist
      await base44.asServiceRole.entities.CampaignReferral.create({
        code: 'SYSTEM',
        campaign_name: 'System Referral Program',
        description: 'Default referral rewards for all users',
        is_active: true,
        referral_reward_amount: 100,
        referral_reward_type: 'wallet_credit'
      });
    }

    // Find the referrer by their referral_code (case-insensitive search)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const referrers = allUsers.filter(u => 
      u.referral_code && u.referral_code.toUpperCase() === referral_code.trim().toUpperCase()
    );

    if (referrers.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid referral code' 
      }, { status: 400 });
    }

    const referrer = referrers[0];

    // Don't allow self-referral
    if (referrer.id === user.id) {
      return Response.json({ 
        success: false, 
        error: 'Cannot use your own referral code' 
      }, { status: 400 });
    }

    // Check if this user already used a referral code
    const existingReferrals = await base44.asServiceRole.entities.Referral.filter({ 
      referee_id: user.id 
    });

    if (existingReferrals.length > 0) {
      return Response.json({ 
        success: false, 
        error: 'You have already used a referral code' 
      }, { status: 400 });
    }

    // Create referral record for referrer (person who referred)
    await base44.asServiceRole.entities.Referral.create({
      referrer_id: referrer.id,
      referrer_name: referrer.display_name || referrer.full_name,
      referee_id: user.id,
      referee_name: user.display_name || user.full_name,
      referral_code: referral_code.trim().toUpperCase(),
      status: 'completed',
      reward_amount: 100,
      rewarded_date: new Date().toISOString()
    });

    // Create referral record for referee (new user who signed up)
    await base44.asServiceRole.entities.Referral.create({
      referrer_id: user.id,
      referrer_name: user.display_name || user.full_name,
      referee_id: user.id,
      referee_name: user.display_name || user.full_name,
      referral_code: referral_code.trim().toUpperCase(),
      status: 'completed',
      reward_amount: 100,
      rewarded_date: new Date().toISOString()
    });

    // Send notification to referrer
    await base44.asServiceRole.entities.Notification.create({
      user_id: referrer.id,
      type: 'payment_received',
      title: '🎉 Referral Bonus!',
      message: `${user.display_name || user.full_name || 'Someone'} joined using your referral code. You earned ₹100!`,
      amount: 100,
      read: false
    });

    // Send notification to referee (new user)
    await base44.asServiceRole.entities.Notification.create({
      user_id: user.id,
      type: 'payment_received',
      title: '🎉 Welcome Bonus!',
      message: `You received ₹100 signup bonus for using referral code ${referral_code.trim().toUpperCase()}!`,
      amount: 100,
      read: false
    });

    return Response.json({ 
      success: true, 
      message: 'Referral processed successfully',
      reward_amount: 100
    });

  } catch (error) {
    console.error('Referral processing error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});