import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, IndianRupee, Calendar, Shield, TrendingUp, 
  AlertTriangle, MapPin, ChevronRight, Building, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      if (userData.user_role !== 'admin' && userData.role !== 'admin') {
        window.location.href = createPageUrl('Discover');
        return;
      }
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 100)
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 100)
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['admin-venues'],
    queryFn: () => base44.entities.Venue.list('-created_date', 50)
  });

  const { data: groupEvents = [] } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => base44.entities.GroupEvent.list('-date', 20)
  });

  const { data: appSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.list();
      return settings[0] || { platform_fee: 15, no_show_penalty_percent: 100 };
    }
  });

  const companions = allUsers.filter(u => u.user_role === 'companion');
  const seekers = allUsers.filter(u => u.user_role === 'seeker');
  const pendingKYC = allUsers.filter(u => u.kyc_status === 'pending');
  const completedBookings = allBookings.filter(b => b.status === 'completed');
  const disputedBookings = allBookings.filter(b => b.status === 'disputed');
  
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.platform_fee || 0), 0);
  const totalGMV = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Companions', value: companions.length, icon: Users, color: 'bg-violet-500' },
    { label: 'Seekers', value: seekers.length, icon: Users, color: 'bg-fuchsia-500' },
    { label: 'Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, color: 'bg-emerald-500' },
    { label: 'Total GMV', value: `₹${totalGMV.toFixed(0)}`, icon: TrendingUp, color: 'bg-teal-500' },
    { label: 'Bookings', value: allBookings.length, icon: Calendar, color: 'bg-amber-500' },
  ];

  const quickLinks = [
    { label: 'Manage Users', desc: `${pendingKYC.length} pending verification`, icon: Users, page: 'AdminUsers', alert: pendingKYC.length > 0 },
    { label: 'Manage Venues', desc: `${venues.length} registered venues`, icon: Building, page: 'AdminVenues' },
    { label: 'Group Events', desc: `${groupEvents.length} events`, icon: Calendar, page: 'AdminGroups' },
    { label: 'Disputes', desc: `${disputedBookings.length} open disputes`, icon: AlertTriangle, page: 'AdminDisputes', alert: disputedBookings.length > 0 },
    { label: 'Platform Settings', desc: 'Configure fees and policies', icon: Settings, page: 'AdminSettings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-4 md:px-8 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-violet-400" />
            <span className="text-violet-400 font-medium">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Circle Dashboard</h1>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="divide-y divide-slate-100">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              to={createPageUrl(link.page)}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <link.icon className="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{link.label}</h3>
                  {link.alert && (
                    <Badge className="bg-red-100 text-red-700">Action needed</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">{link.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          ))}
        </Card>

        {/* Recent Bookings */}
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Bookings</h3>
          
          {allBookings.length === 0 ? (
            <p className="text-slate-500 text-center py-6">No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {allBookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {booking.seeker_name} → {booking.companion_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {booking.date} • {booking.city}
                    </p>
                  </div>
                  <Badge className={
                    booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    booking.status === 'disputed' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {booking.status}
                  </Badge>
                  <span className="font-semibold text-slate-900">₹{booking.total_amount}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Platform Settings */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Platform Settings</h3>
            <Link to={createPageUrl('AdminSettings')}>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">Platform Fee</p>
              <p className="text-2xl font-bold text-slate-900">{appSettings?.platform_fee || 15}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">No-Show Penalty</p>
              <p className="text-2xl font-bold text-slate-900">{appSettings?.no_show_penalty_percent || 100}%</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}