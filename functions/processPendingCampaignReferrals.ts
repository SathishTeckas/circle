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

    // Get all referrals with campaign codes already processed
     const processedReferrals = await base44.asServiceRole.entities.Referral.filter({
       referral_type: 'campaign_signup'
     }, '-created_date', 10000);

     const processedUserIds = new Set(processedReferrals.map(r => r.referee_id));

     // Get all campaign referrals to find users who haven't been rewarded yet
     for (const campaign of campaigns) {
       const campaignRecords = await base44.asServiceRole.entities.Referral.filter({
         referral_code: campaign.code,
         referral_type: 'campaign_signup'
       }, '-created_date', 10000);

       // For campaigns with "none" reward type, still create referral records for tracking
       if (campaignRecords.length === 0 && campaign.referral_reward_type === 'none') {
         continue;
       }
     }

     // Since we can't query User entity directly, we'll process through CampaignReferral stats
     // which are already tracked. Check for users with this campaign code in their signup
     return Response.json({ 
       message: 'Campaign processing requires user referral data - consider checking individual campaigns',
       processedCount: 0

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