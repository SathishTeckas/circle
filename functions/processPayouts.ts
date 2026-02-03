import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all pending payout requests
    const pendingPayouts = await base44.asServiceRole.entities.Payout.filter({
      status: 'pending'
    }, '-created_date', 100);

    if (pendingPayouts.length === 0) {
      return Response.json({ message: 'No pending payouts to process', processed: 0 });
    }

    const results = [];
    const processedCompanions = new Set();

    for (const payout of pendingPayouts) {
      try {
        // Skip if we already processed a payout for this companion in this run
        if (processedCompanions.has(payout.companion_id)) {
          continue;
        }

        // Fetch companion's earnings and existing payouts
        const [completedBookings, allPayouts, referralsAsReferrer, referralsAsReferee, campaignBonuses, systemCampaign] = await Promise.all([
          base44.asServiceRole.entities.Booking.filter({
            companion_id: payout.companion_id,
            status: 'completed',
            escrow_status: 'released'
          }),
          base44.asServiceRole.entities.Payout.filter({
            companion_id: payout.companion_id
          }),
          base44.asServiceRole.entities.Referral.filter({
            referrer_id: payout.companion_id,
            referral_type: 'user_referral'
          }),
          base44.asServiceRole.entities.Referral.filter({
            referee_id: payout.companion_id,
            referral_type: 'user_referral'
          }),
          base44.asServiceRole.entities.WalletTransaction.filter({
            user_id: payout.companion_id,
            transaction_type: 'campaign_bonus'
          }),
          base44.asServiceRole.entities.CampaignReferral.filter({ code: 'SYSTEM' })
        ]);

        // Get system reward amount
        const systemRewardAmount = systemCampaign[0]?.referral_reward_amount || 100;

        // Calculate total earnings (use companion_payout - the amount companion receives)
        const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
        
        // Calculate referral earnings (both as referrer and referee)
        const referralEarnings = [...referralsAsReferrer, ...referralsAsReferee]
          .filter(r => ['completed', 'rewarded'].includes(r.status))
          .reduce((sum, r) => sum + systemRewardAmount, 0);
        
        // Calculate campaign bonus earnings
        const campaignEarnings = campaignBonuses.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate already withdrawn and pending amounts (excluding current payout)
        // Use requested_amount (full amount before fee) for proper balance calculation
        const totalWithdrawn = allPayouts
          .filter(p => p.status === 'completed' && p.id !== payout.id)
          .reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);

        const otherPendingPayouts = allPayouts
          .filter(p => ['approved', 'processing'].includes(p.status) && p.id !== payout.id)
          .reduce((sum, p) => sum + (p.requested_amount || p.amount), 0);

        const availableBalance = totalEarnings + referralEarnings + campaignEarnings - totalWithdrawn - otherPendingPayouts;

        // Use requested_amount for balance validation (amount before platform fee)
        const requestedAmount = payout.requested_amount || payout.amount;
        
        // Validation: Check if sufficient balance
        if (requestedAmount > availableBalance) {
          await base44.asServiceRole.entities.Payout.update(payout.id, {
            status: 'rejected',
            rejection_reason: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}, Requested: ₹${requestedAmount.toFixed(2)}`,
            processed_date: new Date().toISOString(),
            processed_by: 'system_auto'
          });

          // Refund pending payout amount back to user wallet (use requested_amount)
          const companion = await base44.asServiceRole.entities.User.get(payout.companion_id);
          const currentBalance = companion.wallet_balance || 0;
          const refundedBalance = currentBalance + requestedAmount;

          await base44.asServiceRole.entities.User.update(payout.companion_id, {
            wallet_balance: refundedBalance
          });

          // Log refund transaction
          await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: payout.companion_id,
            transaction_type: 'refund',
            amount: payout.amount,
            balance_before: currentBalance,
            balance_after: refundedBalance,
            reference_id: payout.id,
            reference_type: 'Payout',
            description: `Auto-rejected payout refund: Insufficient balance`,
            status: 'completed'
          });

          // Notify companion
          await base44.asServiceRole.entities.Notification.create({
            user_id: payout.companion_id,
            type: 'payout_processed',
            title: '❌ Payout Request Rejected',
            message: `Your payout request of ₹${payout.amount} was rejected due to insufficient balance. Amount refunded to your wallet.`,
            amount: payout.amount
          });

          results.push({ id: payout.id, status: 'rejected', reason: 'insufficient_balance' });
          continue;
        }

        // Check for duplicate payouts (same amount, same companion, within 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const duplicates = allPayouts.filter(p => 
          p.id !== payout.id &&
          p.amount === payout.amount &&
          p.created_date >= fiveMinutesAgo &&
          ['pending', 'approved', 'processing'].includes(p.status)
        );

        if (duplicates.length > 0) {
          await base44.asServiceRole.entities.Payout.update(payout.id, {
            status: 'rejected',
            rejection_reason: 'Duplicate payout request detected',
            processed_date: new Date().toISOString(),
            processed_by: 'system_auto'
          });

          results.push({ id: payout.id, status: 'rejected', reason: 'duplicate' });
          continue;
        }

        // Validate payment details
        let validationError = null;
        if (payout.payment_method === 'upi') {
          if (!payout.payment_details?.upi_id || payout.payment_details.upi_id.trim() === '') {
            validationError = 'Invalid UPI ID';
          }
        } else if (payout.payment_method === 'bank_transfer') {
          const details = payout.payment_details || {};
          if (!details.bank_name || !details.account_number || !details.ifsc_code || !details.account_holder_name) {
            validationError = 'Incomplete bank details';
          }
        }

        if (validationError) {
          await base44.asServiceRole.entities.Payout.update(payout.id, {
            status: 'rejected',
            rejection_reason: validationError,
            processed_date: new Date().toISOString(),
            processed_by: 'system_auto'
          });

          results.push({ id: payout.id, status: 'rejected', reason: 'invalid_details' });
          continue;
        }

        // All validations passed - approve payout
        await base44.asServiceRole.entities.Payout.update(payout.id, {
          status: 'approved',
          admin_notes: 'Auto-approved by system after validation',
          processed_date: new Date().toISOString(),
          processed_by: 'system_auto'
        });

        // Notify companion
        await base44.asServiceRole.entities.Notification.create({
          user_id: payout.companion_id,
          type: 'payout_processed',
          title: '✅ Payout Approved',
          message: `Your payout request of ₹${payout.amount} has been approved and will be processed shortly.`,
          amount: payout.amount
        });

        processedCompanions.add(payout.companion_id);
        results.push({ id: payout.id, status: 'approved', amount: payout.amount });

      } catch (error) {
         // Mark as rejected on error so it doesn't retry infinitely
         await base44.asServiceRole.entities.Payout.update(payout.id, {
           status: 'rejected',
           rejection_reason: `System error: ${error.message}`,
           processed_date: new Date().toISOString(),
           processed_by: 'system_auto'
         });
         results.push({ id: payout.id, status: 'error', error: error.message });
       }
    }

    return Response.json({
      message: 'Payout processing completed',
      processed: results.length,
      results: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});