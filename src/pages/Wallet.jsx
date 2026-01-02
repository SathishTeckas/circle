import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, 
  DollarSign, TrendingUp, ArrowLeft, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Wallet() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: completedBookings = [] } = useQuery({
    queryKey: ['earnings', user?.id],
    queryFn: async () => {
      return await base44.entities.Booking.filter({ 
        companion_id: user.id, 
        status: 'completed' 
      }, '-created_date', 50);
    },
    enabled: !!user?.id
  });

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.companion_payout || 0), 0);
  const walletBalance = user?.wallet_balance || totalEarnings;

  // Group by month for display
  const thisMonth = completedBookings.filter(b => {
    const date = new Date(b.created_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const thisMonthEarnings = thisMonth.reduce((sum, b) => sum + (b.companion_payout || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">My Wallet</h1>
          </div>

          {/* Balance Card */}
          <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
            <p className="text-emerald-100 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold mb-4">${walletBalance.toFixed(2)}</p>
            
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-white text-emerald-600 hover:bg-emerald-50"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="px-4 -mt-4 max-w-lg mx-auto space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">This Month</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">${thisMonthEarnings.toFixed(0)}</p>
            <p className="text-xs text-slate-500">{thisMonth.length} meetups</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm text-slate-600">All Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">${totalEarnings.toFixed(0)}</p>
            <p className="text-xs text-slate-500">{completedBookings.length} total meetups</p>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Earnings</h3>

          {completedBookings.length === 0 ? (
            <div className="text-center py-8">
              <WalletIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No earnings yet</p>
              <p className="text-sm text-slate-500">Complete meetups to start earning</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedBookings.slice(0, 10).map((booking, idx) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{booking.seeker_name}</p>
                    <p className="text-sm text-slate-500">
                      {booking.created_date ? format(new Date(booking.created_date), 'MMM d, yyyy') : 'Recent'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">+${booking.companion_payout?.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{booking.duration_hours}h meetup</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Platform Fee Info */}
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Platform Fee</h4>
              <p className="text-sm text-slate-600 mt-1">
                Circle charges a 15% platform fee on each booking. Your payout shown above is the net amount after fees.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}