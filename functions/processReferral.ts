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

    // Prevent processing if user has campaign code (should use campaign referral instead)
    if (user.campaign_referral_code) {
      return Response.json({ 
        success: false, 
        error: 'You already have a campaign code. Use that for signup rewards.' 
      }, { status: 400 });
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

    // Find the referrer by their referral_code (stored in user profile)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const referrer = allUsers.find(u => 
      u.my_referral_code && u.my_referral_code.toUpperCase() === referral_code.trim().toUpperCase()
    );

    if (!referrer) {
      return Response.json({ 
        success: false, 
        error: 'Invalid referral code' 
      }, { status: 400 });
    }

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

    // Check for duplicate - prevent race conditions
    const duplicateCheck = await base44.asServiceRole.entities.Referral.filter({
      referrer_id: referrer.id,
      referee_id: user.id,
      referral_code: referral_code.trim().toUpperCase()
    });

    if (duplicateCheck.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Referral already processed',
        reward_amount: rewardAmount
      });
    }

    // Create ONE referral record - both parties benefit from it
    const referral = await base44.asServiceRole.entities.Referral.create({
      referrer_id: referrer.id,
      referrer_name: referrer.display_name || referrer.full_name,
      referee_id: user.id,
      referee_name: user.display_name || user.full_name,
      referral_code: referral_code.trim().toUpperCase(),
      referral_type: 'user_referral',
      status: 'completed',
      reward_amount: rewardAmount,
      rewarded_date: new Date().toISOString()
    });

    // Fetch fresh balances before wallet updates (prevent stale data bugs)
    const freshReferrer = await base44.asServiceRole.entities.User.get(referrer.id);
    const freshReferee = await base44.asServiceRole.entities.User.get(user.id);

    // Update wallet balance for referrer
    const referrerOldBalance = freshReferrer.wallet_balance || 0;
    const referrerNewBalance = referrerOldBalance + rewardAmount;
    await base44.asServiceRole.entities.User.update(referrer.id, {
      wallet_balance: referrerNewBalance
    });

    // Log referrer transaction
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: referrer.id,
      transaction_type: 'referral_bonus',
      amount: rewardAmount,
      balance_before: referrerOldBalance,
      balance_after: referrerNewBalance,
      reference_id: referral.id,
      reference_type: 'Referral',
      description: `Referral bonus from ${user.display_name || user.full_name}`
    });

    // Update wallet balance for referee
    const refereeOldBalance = freshReferee.wallet_balance || 0;
    const refereeNewBalance = refereeOldBalance + rewardAmount;
    await base44.asServiceRole.entities.User.update(user.id, {
      wallet_balance: refereeNewBalance
    });

    // Log referee transaction
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: user.id,
      transaction_type: 'referral_bonus',
      amount: rewardAmount,
      balance_before: refereeOldBalance,
      balance_after: refereeNewBalance,
      reference_id: referral.id,
      reference_type: 'Referral',
      description: `Welcome bonus using code ${referral_code.trim().toUpperCase()}`
    });

    // Update referral status to rewarded (final state change)
    await base44.asServiceRole.entities.Referral.update(referral.id, {
      status: 'rewarded'
    });

    // Send notification to referrer
    await base44.asServiceRole.entities.Notification.create({
      user_id: referrer.id,
      type: 'referral_bonus',
      title: '🎉 Referral Bonus Earned!',
      message: `${user.display_name || user.full_name || 'Someone'} joined using your referral code. You earned ₹${rewardAmount}!`,
      amount: rewardAmount,
      read: false
    });

    // Send notification to referee (new user)
    await base44.asServiceRole.entities.Notification.create({
      user_id: user.id,
      type: 'referral_bonus',
      title: '🎉 Welcome Bonus Received!',
      message: `You received ₹${rewardAmount} signup bonus for using referral code ${referral_code.trim().toUpperCase()}!`,
      amount: rewardAmount,
      read: false
    });

    return Response.json({ 
      success: true, 
      message: 'Referral processed successfully',
      reward_amount: rewardAmount
    });

  } catch (error) {
    console.error('Referral processing error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});