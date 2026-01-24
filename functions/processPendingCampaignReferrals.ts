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
    const campaignCodes = campaigns.map(c => c.code);

    // Get all users with campaign codes but no campaign referral record yet
     const allUsers = await base44.asServiceRole.entities.User.list('', 1000);

     for (const u of allUsers) {
       if (!u.campaign_referral_code || !campaignCodes.includes(u.campaign_referral_code)) {
         continue;
       }

      // Check if already processed
      const existingReferrals = await base44.asServiceRole.entities.Referral.filter({
        referee_id: u.id,
        referral_code: u.campaign_referral_code,
        referral_type: 'campaign_signup'
      });

      if (existingReferrals.length > 0) {
        continue; // Already processed
      }

      // Process this user
      try {
        await base44.functions.invoke('updateCampaignReferralStats', {
          entity_id: u.id,
          data: u,
          event: { type: 'create' }
        });
        processedCount++;
      } catch (err) {
        console.error(`Failed to process campaign for user ${u.id}:`, err.message);
      }
    }

    return Response.json({ 
      message: `Processed ${processedCount} pending campaign referrals`,
      processedCount 
    });
  } catch (error) {
    console.error('Error in processPendingCampaignReferrals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});