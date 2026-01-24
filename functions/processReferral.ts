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

    // Create referral record
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

    // Add ₹100 to referrer's wallet
    const referrerWallet = await base44.asServiceRole.entities.User.filter({ id: referrer.id });
    const currentBalance = referrerWallet[0]?.wallet_balance || 0;
    await base44.asServiceRole.entities.User.update(referrer.id, {
      wallet_balance: currentBalance + 100
    });

    // Add ₹100 to referee's (new user's) wallet
    const refereeWallet = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const refereeBalance = refereeWallet[0]?.wallet_balance || 0;
    await base44.asServiceRole.entities.User.update(user.id, {
      wallet_balance: refereeBalance + 100
    });

    // Send notification to referrer
    await base44.asServiceRole.entities.Notification.create({
      user_id: referrer.id,
      type: 'payment_received',
      title: 'Referral Bonus!',
      message: `${user.display_name || user.full_name || 'Someone'} joined using your referral code. You earned ₹100!`,
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