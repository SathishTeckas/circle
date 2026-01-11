import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only allow admin users to run this function
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log('Starting expired bookings check...');

        // Get all pending bookings
        const pendingBookings = await base44.asServiceRole.entities.Booking.filter({ 
            status: 'pending' 
        });

        console.log(`Found ${pendingBookings.length} pending bookings`);

        const now = new Date();
        let cancelledCount = 0;

        for (const booking of pendingBookings) {
            if (!booking.request_expires_at) continue;

            const expiresAt = new Date(booking.request_expires_at);
            
            // Check if booking has expired
            if (now > expiresAt) {
                console.log(`Cancelling expired booking: ${booking.id}`);
                
                // Update booking to rejected with refund
                await base44.asServiceRole.entities.Booking.update(booking.id, {
                    status: 'rejected',
                    escrow_status: 'refunded'
                });

                // Set availability back to available
                if (booking.availability_id) {
                    await base44.asServiceRole.entities.Availability.update(booking.availability_id, {
                        status: 'available'
                    });
                }

                // Notify seeker about expiration
                await base44.asServiceRole.entities.Notification.create({
                    user_id: booking.seeker_id,
                    type: 'booking_rejected',
                    title: '⏰ Request Expired',
                    message: 'Your booking request expired. Full refund has been processed.',
                    booking_id: booking.id,
                    amount: booking.total_amount
                });

                // Notify seeker about refund
                await base44.asServiceRole.entities.Notification.create({
                    user_id: booking.seeker_id,
                    type: 'payment_refunded',
                    title: '💰 Refund Processed',
                    message: `₹${Math.ceil(booking.total_amount)} has been refunded to your account`,
                    amount: booking.total_amount
                });

                cancelledCount++;
            }
        }

        console.log(`Cancelled ${cancelledCount} expired bookings`);

        return Response.json({
            success: true,
            checked: pendingBookings.length,
            cancelled: cancelledCount
        });
    } catch (error) {
        console.error('Error cancelling expired bookings:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});