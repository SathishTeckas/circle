import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    console.log('User object:', JSON.stringify(user));
    console.log('User role:', user?.user_role, 'Role:', user?.role);

    if (!user || (user.user_role !== 'admin' && user.role !== 'admin')) {
      return Response.json({ 
        error: 'Forbidden: Admin access required',
        debug: { user_role: user?.user_role, role: user?.role }
      }, { status: 403 });
    }

    const { dataType, startDate, endDate } = await req.json();

    if (dataType === 'users') {
      const users = await base44.asServiceRole.entities.User.list('', 1000);
      const csv = convertToCSV(users, ['id', 'full_name', 'email', 'user_role', 'active_role', 'city', 'average_rating', 'total_reviews', 'kyc_status', 'created_date']);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=users.csv'
        }
      });
    }

    if (dataType === 'bookings') {
      const bookings = await base44.asServiceRole.entities.Booking.list('', 1000);
      const csv = convertToCSV(bookings, ['id', 'seeker_name', 'companion_name', 'date', 'start_time', 'end_time', 'duration_hours', 'base_price', 'platform_fee', 'total_amount', 'companion_payout', 'status', 'escrow_status', 'city', 'created_date']);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=bookings.csv'
        }
      });
    }

    if (dataType === 'groupParticipants') {
      const participants = await base44.asServiceRole.entities.GroupParticipant.list('', 1000);
      const csv = convertToCSV(participants, ['id', 'event_id', 'user_name', 'status', 'created_date']);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=group_attendance.csv'
        }
      });
    }

    if (dataType === 'groupEvents') {
      const events = await base44.asServiceRole.entities.GroupEvent.list('', 1000);
      const csv = convertToCSV(events, ['id', 'title', 'city', 'date', 'time', 'language', 'max_participants', 'current_participants', 'status', 'created_date']);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=group_events.csv'
        }
      });
    }

    if (dataType === 'gmv') {
      let bookings = await base44.asServiceRole.entities.Booking.list('', 1000);
      
      // Filter by date range if provided
      if (startDate && endDate) {
        bookings = bookings.filter(b => {
          if (!b.date) return false;
          const bookingDate = new Date(b.date);
          return bookingDate >= new Date(startDate) && bookingDate <= new Date(endDate);
        });
      }
      
      // Filter only completed bookings
      const completedBookings = bookings.filter(b => b.status === 'completed');
      
      // Calculate totals
      const totalGMV = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.platform_fee || 0), 0);
      
      // Create CSV with booking details and summary
      const headers = ['Booking ID', 'Date', 'Seeker', 'Companion', 'City', 'Duration (hrs)', 'Base Price (₹)', 'Platform Fee (₹)', 'Total Amount (₹)', 'Companion Payout (₹)', 'Status'];
      const rows = completedBookings.map(b => [
        b.id || '',
        b.date || '',
        b.seeker_name || '',
        b.companion_name || '',
        b.city || '',
        b.duration_hours || '',
        b.base_price || '',
        b.platform_fee || '',
        b.total_amount || '',
        b.companion_payout || '',
        b.status || ''
      ]);
      
      // Add summary rows
      rows.push([]);
      rows.push(['SUMMARY']);
      rows.push(['Total Bookings', completedBookings.length]);
      rows.push(['Total GMV (₹)', totalGMV.toFixed(2)]);
      rows.push(['Total Revenue (₹)', totalRevenue.toFixed(2)]);
      if (startDate && endDate) {
        rows.push(['Date Range', `${startDate} to ${endDate}`]);
      }
      
      const csv = headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
      
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=gmv_revenue_${startDate || 'all'}_to_${endDate || 'all'}.csv`
        }
      });
    }

    return Response.json({ error: 'Invalid dataType' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function convertToCSV(data, headers) {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvHeaders = headers.join(',');
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return csvHeaders + '\n' + rows.join('\n');
}