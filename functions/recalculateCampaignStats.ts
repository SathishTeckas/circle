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
    const { campaign_code } = body;

    // Get all campaigns to recalculate
    const campaigns = campaign_code 
      ? await base44.asServiceRole.entities.CampaignReferral.filter({ code: campaign_code })
      : await base44.asServiceRole.entities.CampaignReferral.list();

    const updates = [];

    for (const campaign of campaigns) {
      // Get all referrals for this campaign with status completed or rewarded
      const referrals = await base44.asServiceRole.entities.Referral.filter({
        referral_code: campaign.code,
        referral_type: 'campaign_signup'
      });

      const completedReferrals = referrals.filter(r => ['completed', 'rewarded'].includes(r.status));

      if (completedReferrals.length > 0) {
        // Update campaign stats
        const updateData = {
          total_signups: completedReferrals.length
        };

        await base44.asServiceRole.entities.CampaignReferral.update(campaign.id, updateData);
        updates.push({
          campaign_code: campaign.code,
          total_signups: completedReferrals.length
        });
      }
    }

    return Response.json({
      success: true,
      message: `Recalculated stats for ${updates.length} campaign(s)`,
      updates
    });
  } catch (error) {
    console.error('Error in recalculateCampaignStats:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});