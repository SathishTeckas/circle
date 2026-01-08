import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Users, Plus, Calendar as CalendarIcon, Clock, MapPin,
  ArrowLeft, Trash2, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];
const TIME_SLOTS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

export default function AdminGroups() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    city: '',
    time: '',
    language: 'English',
    age_range_min: '25',
    age_range_max: '40',
    max_participants: '8',
    venue_name: '',
    venue_address: '',
    description: ''
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      if (user.user_role !== 'admin' && user.role !== 'admin') {
        window.location.href = createPageUrl('Discover');
      }
    };
    checkAdmin();
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-group-events'],
    queryFn: () => base44.entities.GroupEvent.list('-date', 50)
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['venues-for-groups'],
    queryFn: () => base44.entities.Venue.filter({ verified: true }, 'name', 50)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.GroupEvent.create({
        ...formData,
        date: format(selectedDate, 'yyyy-MM-dd'),
        age_range_min: parseInt(formData.age_range_min),
        age_range_max: parseInt(formData.age_range_max),
        max_participants: parseInt(formData.max_participants),
        current_participants: 0,
        status: 'open'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-events'] });
      setShowForm(false);
      setFormData({
        title: '', city: '', time: '', language: 'English',
        age_range_min: '25', age_range_max: '40', max_participants: '8',
        venue_name: '', venue_address: '', description: ''
      });
      setSelectedDate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId) => {
      await base44.entities.GroupEvent.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-events'] });
    }
  });

  const canSubmit = selectedDate && formData.city && formData.time && formData.language;

  const statusColors = {
    open: 'bg-emerald-100 text-emerald-700',
    full: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-violet-100 text-violet-700',
    cancelled: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = createPageUrl('AdminDashboard')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Group Events</h1>
                <p className="text-sm text-slate-600">{events.length} events created</p>
              </div>
            </div>

            <Sheet open={showForm} onOpenChange={setShowForm}>
              <SheetTrigger asChild>
                <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Create Group Event</SheetTitle>
                </SheetHeader>

                <div className="space-y-4 mt-6 pb-6">
                  <div>
                    <Label>Event Title (Optional)</Label>
                    <Input
                      placeholder="e.g., Friday Night Social"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Time</Label>
                    <Select value={formData.time} onValueChange={(v) => setFormData({ ...formData, time: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>City</Label>
                    <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v })}>
                      <SelectTrigger className="mt-1">
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
                    <Label>Language</Label>
                    <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Age Min</Label>
                      <Input
                        type="number"
                        value={formData.age_range_min}
                        onChange={(e) => setFormData({ ...formData, age_range_min: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Age Max</Label>
                      <Input
                        type="number"
                        value={formData.age_range_max}
                        onChange={(e) => setFormData({ ...formData, age_range_max: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Max Participants</Label>
                    <Input
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Venue Name</Label>
                    <Input
                      placeholder="Restaurant or cafe name"
                      value={formData.venue_name}
                      onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Venue Address</Label>
                    <Input
                      placeholder="Full address"
                      value={formData.venue_address}
                      onChange={(e) => setFormData({ ...formData, venue_address: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Any additional details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!canSubmit || createMutation.isPending}
                    className="w-full h-12 bg-fuchsia-600 hover:bg-fuchsia-700 rounded-xl"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">No events yet</h3>
            <p className="text-slate-600">Create group events for users to join</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {event.title || 'Group Meetup'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColors[event.status]}>
                          {event.status}
                        </Badge>
                        <Badge variant="outline">{event.language}</Badge>
                        <span className="text-sm text-slate-500">
                          Ages {event.age_range_min}-{event.age_range_max}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(event.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-fuchsia-600" />
                      {event.date ? format(new Date(event.date), 'EEEE, MMMM d, yyyy') : 'TBD'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-fuchsia-600" />
                      {event.time}
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-fuchsia-600" />
                        {event.venue_name}, {event.city}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {event.current_participants || 0}/{event.max_participants || 8} participants
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}