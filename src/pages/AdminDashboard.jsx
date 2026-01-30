import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { formatCurrency, formatCompactCurrency } from '../components/utils/formatCurrency';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Users, IndianRupee, Calendar, Shield, TrendingUp, 
  AlertTriangle, MapPin, ChevronRight, Building, Settings, Download, Wallet, CalendarRange
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (!userData || (userData.user_role !== 'admin' && userData.role !== 'admin')) {
          window.location.href = createPageUrl('Discover');
          return;
        }
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
        window.location.href = createPageUrl('Welcome');
      }
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
    enabled: !!user,
    staleTime: 2 * 60 * 1000
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['admin-venues'],
    queryFn: () => base44.entities.Venue.list('-created_date', 100),
    enabled: !!user,
    staleTime: 10 * 60 * 1000
  });

  const { data: groupEventsRaw = [] } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => base44.entities.GroupEvent.list('-date', 20),
    enabled: !!user
  });

  // Filter out past group events
  const groupEvents = React.useMemo(() => {
    const now = new Date();
    return groupEventsRaw.filter(event => {
      if (!event?.date || !event?.time) return false;
      
      const eventDate = new Date(event.date);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (eventDate < todayStart) return false;
      
      if (eventDate.toDateString() === now.toDateString()) {
        const [eventHour, eventMinute] = event.time.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        return !(eventHour < currentHour || (eventHour === currentHour && eventMinute <= currentMinute));
      }
      
      return true;
    });
  }, [groupEventsRaw]);

  const { data: appSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.list();
      return settings[0] || { platform_fee: 15, no_show_penalty_percent: 100 };
    },
    enabled: !!user
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => base44.entities.Dispute.filter({ status: 'open' }),
    enabled: !!user,
    staleTime: 2 * 60 * 1000
  });

  const companions = allUsers?.filter(u => u?.user_role === 'companion') || [];
  const seekers = allUsers?.filter(u => u?.user_role === 'seeker') || [];
  const pendingKYC = allUsers?.filter(u => u?.kyc_status === 'pending') || [];
  const completedBookings = allBookings?.filter(b => b?.status === 'completed') || [];
  
  const totalRevenue = completedBookings?.reduce((sum, b) => sum + (b?.platform_fee || 0), 0) || 0;
  const totalGMV = completedBookings?.reduce((sum, b) => sum + (b?.total_amount || 0), 0) || 0;

  const handleExport = async (dataType) => {
    setExporting(dataType);
    try {
      const payload = { dataType };
      
      // Add date range for GMV export
      if (dataType === 'gmv' && dateRange.from && dateRange.to) {
        payload.startDate = format(dateRange.from, 'yyyy-MM-dd');
        payload.endDate = format(dateRange.to, 'yyyy-MM-dd');
      }
      
      const response = await base44.functions.invoke('exportAdminData', payload);
      
      console.log('Export response:', response);
      
      // Check if we got an error response
      if (response?.data?.error) {
        toast.error(response.data.error);
        return;
      }
      
      // The CSV data should be in response.data
      let csvData = response?.data;
      
      if (!csvData) {
        toast.error('No data received from export');
        return;
      }
      
      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed: ' + (error?.response?.data?.error || error?.message || 'Please try again'));
    } finally {
      setExporting(null);
    }
  };

  const stats = [
    { label: 'Total Users', value: allUsers?.length || 0, icon: Users, color: '#74B9FF' },
    { label: 'Companions', value: companions?.length || 0, icon: Users, color: '#A8A4FF' },
    { label: 'Seekers', value: seekers?.length || 0, icon: Users, color: '#FFB347' },
    { label: 'Revenue', value: formatCompactCurrency(totalRevenue || 0), icon: IndianRupee, color: '#4ECDC4' },
    { label: 'Total GMV', value: formatCompactCurrency(totalGMV || 0), icon: TrendingUp, color: '#FFD93D' },
    { label: 'Bookings', value: allBookings?.length || 0, icon: Calendar, color: '#FF6B6B' },
  ];

  const { data: payouts = [] } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => base44.entities.Payout.list('-created_date', 100),
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const pendingPayouts = payouts?.filter(p => p?.status === 'pending') || [];

  const quickLinks = [
    { label: 'Manage Users', desc: `${pendingKYC?.length || 0} pending verification`, icon: Users, page: 'AdminUsers', alert: (pendingKYC?.length || 0) > 0 },
    { label: 'Manage Venues', desc: `${venues?.length || 0} registered venues`, icon: Building, page: 'AdminVenues' },
    { label: 'Manage Cities', desc: 'Add and manage cities & areas', icon: MapPin, page: 'AdminCities' },
    { label: 'Campaign Referrals', desc: 'Track marketing campaigns', icon: TrendingUp, page: 'AdminCampaignReferrals' },
    { label: 'Group Events', desc: `${groupEvents?.length || 0} events`, icon: Calendar, page: 'AdminGroups' },
    { label: 'Manage Payouts', desc: `${pendingPayouts?.length || 0} pending payouts`, icon: Wallet, page: 'AdminPayouts', alert: (pendingPayouts?.length || 0) > 0 },
    { label: 'Admin Management', desc: 'Manage administrators', icon: Shield, page: 'AdminManagement' },
    { label: 'Disputes', desc: `${disputes?.length || 0} open disputes`, icon: AlertTriangle, page: 'AdminDisputes', alert: (disputes?.length || 0) > 0 },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="px-4 md:px-8 pt-8 pb-12" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6" style={{ color: '#2D3436' }} />
            <span className="font-bold" style={{ color: '#2D3436' }}>Admin Panel</span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>Circle Dashboard</h1>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Grid */}
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.color }}>
                    <stat.icon className="w-5 h-5" style={{ color: '#2D3436' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl md:text-2xl font-extrabold truncate" style={{ color: '#2D3436' }}>{stat.value}</p>
                    <p className="text-xs md:text-sm" style={{ color: '#636E72' }}>{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="divide-y" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none', divideColor: '#DFE6E9' }}>
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              to={createPageUrl(link.page)}
              className="flex items-center gap-4 p-4 hover:opacity-90 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FFF3B8' }}>
                <link.icon className="w-6 h-6" style={{ color: '#2D3436' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold" style={{ color: '#2D3436' }}>{link.label}</h3>
                  {link.alert && (
                    <Badge className="font-bold" style={{ background: '#FF6B6B', color: '#FFFFFF' }}>Action needed</Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#636E72' }}>{link.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: '#B2BEC3' }} />
            </Link>
          ))}
        </Card>

        {/* Export Data */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <h3 className="font-bold mb-4" style={{ color: '#2D3436' }}>Export Data for Analysis</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button
              onClick={() => handleExport('users')}
              disabled={!!exporting}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {exporting === 'users' ? (
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="text-xs">Users</span>
            </Button>
            <Button
              onClick={() => handleExport('bookings')}
              disabled={!!exporting}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {exporting === 'bookings' ? (
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="text-xs">Bookings</span>
            </Button>
            <Button
              onClick={() => handleExport('groupEvents')}
              disabled={!!exporting}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {exporting === 'groupEvents' ? (
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="text-xs">Group Events</span>
            </Button>
            <Button
              onClick={() => handleExport('groupParticipants')}
              disabled={!!exporting}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-3"
            >
              {exporting === 'groupParticipants' ? (
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="text-xs">Attendance</span>
            </Button>
            <Button
              onClick={() => handleExport('gmv')}
              disabled={!!exporting}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-3 border-emerald-200 hover:bg-emerald-50"
            >
              {exporting === 'gmv' ? (
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-emerald-600" />
              )}
              <span className="text-xs text-emerald-700">GMV & Revenue</span>
            </Button>
          </div>

          {/* Date Range Filter for GMV */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-sm text-slate-600 font-medium">GMV Export Date Filter:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left">
                    <CalendarRange className="w-4 h-4 mr-2" />
                    {dateRange.from && dateRange.to ? (
                      `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                    ) : (
                      'Select date range (optional)'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range || { from: null, to: null })}
                    numberOfMonths={2}
                    classNames={{
                      day_selected: "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus:bg-emerald-700 focus:text-white",
                      day_range_middle: "bg-emerald-100"
                    }}
                  />
                </PopoverContent>
              </Popover>
              {dateRange.from && dateRange.to && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({ from: null, to: null })}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {dateRange.from && dateRange.to 
                ? `GMV export will include bookings from ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}`
                : 'No date filter selected - GMV export will include all completed bookings'
              }
            </p>
          </div>
        </Card>

        {/* Recent Bookings */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <h3 className="font-bold mb-4" style={{ color: '#2D3436' }}>Recent Bookings</h3>
          
          {!allBookings || allBookings.length === 0 ? (
            <p className="text-center py-6" style={{ color: '#636E72' }}>No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {allBookings.slice(0, 5).map((booking) => (
                <div key={booking?.id} className="flex items-center gap-4 py-2 border-b last:border-0" style={{ borderColor: '#DFE6E9' }}>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: '#2D3436' }}>
                      {booking?.seeker_name || 'Unknown'} → {booking?.companion_name || 'Unknown'}
                    </p>
                    <p className="text-sm" style={{ color: '#636E72' }}>
                      {booking?.date || 'N/A'} • {booking?.city || 'N/A'}
                    </p>
                  </div>
                  <Badge 
                    className="font-bold"
                    style={{
                      background: booking?.status === 'completed' ? '#4ECDC4' :
                        booking?.status === 'pending' ? '#FFF3B8' :
                        booking?.status === 'disputed' ? '#FF6B6B' : '#DFE6E9',
                      color: booking?.status === 'completed' || booking?.status === 'disputed' ? '#FFFFFF' : '#2D3436'
                    }}
                  >
                    {booking?.status || 'unknown'}
                  </Badge>
                  <span className="font-extrabold" style={{ color: '#2D3436' }}>{formatCurrency(booking?.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Platform Settings */}
        <Card className="p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: '#2D3436' }}>Platform Settings</h3>
            <Link to={createPageUrl('AdminSettings')}>
              <Button variant="outline" size="sm" className="font-bold" style={{ borderColor: '#DFE6E9', color: '#2D3436' }}>
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#FFF3B8' }}>
              <p className="text-sm" style={{ color: '#636E72' }}>Platform Fee</p>
              <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{appSettings?.platform_fee || 15}%</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#FFB347' }}>
              <p className="text-sm" style={{ color: '#2D3436' }}>No-Show Penalty</p>
              <p className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{appSettings?.no_show_penalty_percent || 100}%</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}