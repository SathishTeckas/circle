import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Calendar as CalendarIcon, Clock, MapPin, DollarSign, 
  Trash2, Edit, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const AREAS = ['Downtown', 'Midtown', 'Uptown', 'Westside', 'Eastside', 'Central'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export default function ManageAvailability() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    area: '',
    city: '',
    price_per_hour: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['my-availabilities', user?.id],
    queryFn: async () => {
      return await base44.entities.Availability.filter({ companion_id: user.id }, '-date', 50);
    },
    enabled: !!user?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const startHour = parseInt(formData.start_time.split(':')[0]);
      const endHour = parseInt(formData.end_time.split(':')[0]);
      const duration = endHour - startHour;

      await base44.entities.Availability.create({
        companion_id: user.id,
        companion_name: user.full_name,
        companion_photo: user.profile_photos?.[0],
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_hours: duration,
        area: formData.area,
        city: formData.city,
        price_per_hour: parseFloat(formData.price_per_hour),
        total_price: parseFloat(formData.price_per_hour) * duration,
        status: 'available',
        languages: user.languages || ['English'],
        interests: user.interests || [],
        gender: user.gender
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
      setShowForm(false);
      setFormData({ start_time: '', end_time: '', area: '', city: '', price_per_hour: '' });
      setSelectedDate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Availability.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
    }
  });

  const activeAvailabilities = availabilities.filter(a => a.status === 'available');
  const bookedAvailabilities = availabilities.filter(a => ['pending', 'booked'].includes(a.status));

  const canSubmit = selectedDate && formData.start_time && formData.end_time && 
                    formData.area && formData.city && formData.price_per_hour;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">My Availability</h1>
            <p className="text-sm text-slate-600">{activeAvailabilities.length} active slots</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Add New Button */}
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetTrigger asChild>
            <Button className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Availability
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
            <SheetHeader className="mb-6">
              <SheetTitle>Create Availability</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 overflow-y-auto pb-24">
              {/* Date Selection */}
              <div>
                <Label className="mb-2 block">Select Date</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-xl border"
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Start Time</Label>
                  <Select 
                    value={formData.start_time} 
                    onValueChange={(v) => setFormData({ ...formData, start_time: v })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">End Time</Label>
                  <Select 
                    value={formData.end_time} 
                    onValueChange={(v) => setFormData({ ...formData, end_time: v })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.filter(t => t > formData.start_time).map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div>
                <Label className="mb-2 block">City</Label>
                <Select 
                  value={formData.city} 
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Preferred Area</Label>
                <Select 
                  value={formData.area} 
                  onValueChange={(v) => setFormData({ ...formData, area: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div>
                <Label className="mb-2 block">Price per Hour ($)</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={formData.price_per_hour}
                  onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="w-full h-14 bg-violet-600 hover:bg-violet-700 rounded-xl text-lg"
              >
                {createMutation.isPending ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Availability'
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Active Slots */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Active Slots</h3>
          {activeAvailabilities.length === 0 ? (
            <Card className="p-6 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No active availability slots</p>
              <p className="text-sm text-slate-500">Add slots to start receiving bookings</p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {activeAvailabilities.map((slot) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-violet-600" />
                            <span className="font-medium text-slate-900">
                              {format(new Date(slot.date), 'EEE, MMM d')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4" />
                            {slot.start_time} - {slot.end_time}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4" />
                            {slot.area}, {slot.city}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">${slot.price_per_hour}/hr</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(slot.id)}
                            className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Booked Slots */}
        {bookedAvailabilities.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Booked Slots</h3>
            <div className="space-y-3">
              {bookedAvailabilities.map((slot) => (
                <Card key={slot.id} className="p-4 bg-violet-50 border-violet-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-violet-600" />
                        <span className="font-medium text-slate-900">
                          {format(new Date(slot.date), 'EEE, MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                    <Badge className="bg-violet-200 text-violet-800">
                      {slot.status === 'pending' ? 'Pending' : 'Booked'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}