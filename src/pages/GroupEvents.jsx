import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Calendar, Clock, MapPin, Globe, Sparkles, 
  ChevronRight, UserPlus, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];

export default function GroupEvents() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    city: ''
  });
  const [activeTab, setActiveTab] = useState('discover');
  const [myEventsFilter, setMyEventsFilter] = useState('upcoming');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData?.city) {
          setFilters(f => ({ ...f, city: userData.city }));
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['group-events', filters],
    queryFn: async () => {
      const query = { status: 'open' };
      if (filters.city) query.city = filters.city;
      return await base44.entities.GroupEvent.filter(query, 'date', 20);
    }
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['my-participations', user?.id],
    queryFn: async () => {
      return await base44.entities.GroupParticipant.filter({ user_id: user.id }, '-created_date', 20);
    },
    enabled: !!user?.id
  });

  const myEventIds = myParticipations.map(p => p.event_id);
  const myEvents = events.filter(e => myEventIds.includes(e.id));

  // Filter my events by time
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const upcomingEvents = myEvents.filter(event => {
    if (!event.date || !event.time) return false;
    const eventDate = new Date(event.date);
    
    // If date is in the future
    if (eventDate > todayStart) return true;
    
    // If date is today, check if time hasn't passed
    if (eventDate.toDateString() === now.toDateString()) {
      const [eventHour, eventMinute] = event.time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      return eventHour > currentHour || (eventHour === currentHour && eventMinute > currentMinute);
    }
    
    return false;
  });

  const ongoingEvents = myEvents.filter(event => {
    if (!event.date || !event.time) return false;
    const eventDate = new Date(event.date);
    
    // Only events happening today
    if (eventDate.toDateString() !== now.toDateString()) return false;
    
    const [eventHour, eventMinute] = event.time.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current time is within event time (assuming 2-3 hour duration)
    const eventEndHour = eventHour + 3;
    return (eventHour < currentHour || (eventHour === currentHour && eventMinute <= currentMinute)) &&
           currentHour < eventEndHour;
  });

  const pastEvents = myEvents.filter(event => {
    if (!event.date || !event.time) return false;
    const eventDate = new Date(event.date);
    
    // If date is in the past
    if (eventDate < todayStart) return true;
    
    // If date is today, check if time has passed (including event duration)
    if (eventDate.toDateString() === now.toDateString()) {
      const [eventHour, eventMinute] = event.time.split(':').map(Number);
      const eventEndHour = eventHour + 3; // Assuming 3 hour duration
      const currentHour = now.getHours();
      return currentHour >= eventEndHour;
    }
    
    return false;
  });

  const completedEvents = myEvents.filter(event => {
    const participation = myParticipations.find(p => p.event_id === event.id);
    return participation?.status === 'attended' || event.status === 'completed';
  });

  const filteredMyEvents = myEventsFilter === 'upcoming' ? upcomingEvents :
                          myEventsFilter === 'in_progress' ? ongoingEvents :
                          myEventsFilter === 'completed' ? completedEvents :
                          pastEvents;

  const joinMutation = useMutation({
    mutationFn: async (eventId) => {
      const eventData = events.find(e => e.id === eventId);
      const amount = eventData?.price || 0;
      
      await base44.entities.GroupParticipant.create({
        event_id: eventId,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        user_gender: user.gender,
        user_age: user.date_of_birth ? Math.floor((new Date() - new Date(user.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        user_personality: user.personality,
        user_languages: user.languages || [],
        status: 'registered',
        payment_status: 'completed',
        amount_paid: amount
      });
      
      // Update participant count and total amount collected
      if (eventData) {
        await base44.entities.GroupEvent.update(eventId, {
          current_participants: (eventData.current_participants || 0) + 1,
          total_amount_collected: (eventData.total_amount_collected || 0) + amount
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events'] });
      queryClient.invalidateQueries({ queryKey: ['my-participations'] });
    }
  });

  const discoverEvents = events.filter(e => !myEventIds.includes(e.id));

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-fuchsia-600 to-pink-600 px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Group Meetups</h1>
          <p className="text-fuchsia-100">
            No bios. No planning. Just show up and connect.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-lg mx-auto space-y-4">
        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-r from-fuchsia-50 to-pink-50 border-fuchsia-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-fuchsia-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-fuchsia-900">How it works</h3>
              <ul className="text-sm text-fuchsia-700 mt-2 space-y-1">
                <li>• Pick an event that matches your preferences</li>
                <li>• Show up at the venue at the scheduled time</li>
                <li>• Pay for your own food/drinks at the venue</li>
                <li>• Meet new people in a relaxed setting</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-slate-100 p-1 rounded-xl">
            <TabsTrigger 
              value="discover" 
              className="flex-1 rounded-lg data-[state=active]:bg-white"
            >
              Discover
            </TabsTrigger>
            <TabsTrigger 
              value="joined"
              className="flex-1 rounded-lg data-[state=active]:bg-white"
            >
              My Events ({myEvents.length})
            </TabsTrigger>
          </TabsList>

          {/* Filters - shown for all tabs */}
          <div className="mt-4 space-y-3">
            {/* City Filter */}
            <Select 
              value={filters.city} 
              onValueChange={(v) => setFilters({ ...filters, city: v })}
            >
              <SelectTrigger className="h-11 rounded-xl w-full">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Cities</SelectItem>
                {CITIES.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* My Events Time Filter - only shown on joined tab */}
            {activeTab === 'joined' && myEvents.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Badge 
                  className={cn(
                    "cursor-pointer px-4 py-2 whitespace-nowrap",
                    myEventsFilter === 'upcoming' 
                      ? "bg-fuchsia-600 text-white hover:bg-fuchsia-600" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => setMyEventsFilter('upcoming')}
                >
                  Upcoming ({upcomingEvents.length})
                </Badge>
                <Badge 
                  className={cn(
                    "cursor-pointer px-4 py-2 whitespace-nowrap",
                    myEventsFilter === 'in_progress' 
                      ? "bg-fuchsia-600 text-white hover:bg-fuchsia-600" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => setMyEventsFilter('in_progress')}
                >
                  In Progress ({ongoingEvents.length})
                </Badge>
                <Badge 
                  className={cn(
                    "cursor-pointer px-4 py-2 whitespace-nowrap",
                    myEventsFilter === 'completed' 
                      ? "bg-fuchsia-600 text-white hover:bg-fuchsia-600" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => setMyEventsFilter('completed')}
                >
                  Completed ({completedEvents.length})
                </Badge>
              </div>
            )}
          </div>

          <TabsContent value="discover" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
                ))}
              </div>
            ) : discoverEvents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">No events found</h3>
                <p className="text-slate-600 text-sm">Check back soon for new group events</p>
              </div>
            ) : (
              discoverEvents.map((event, idx) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  idx={idx}
                  isJoined={false}
                  onJoin={() => joinMutation.mutate(event.id)}
                  isJoining={joinMutation.isPending}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="joined" className="mt-4 space-y-4">
            {myEvents.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">No events joined</h3>
                <p className="text-slate-600 text-sm">Browse and join events to see them here</p>
              </div>
            ) : (
              <>
                {filteredMyEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-2">No {myEventsFilter === 'in_progress' ? 'in progress' : myEventsFilter} events</h3>
                    <p className="text-slate-600 text-sm">
                      {myEventsFilter === 'upcoming' && 'Join more events to see them here'}
                      {myEventsFilter === 'in_progress' && 'No events happening right now'}
                      {myEventsFilter === 'completed' && 'No completed events yet'}
                    </p>
                  </div>
                ) : (
                  filteredMyEvents.map((event, idx) => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      idx={idx}
                      isJoined={true}
                    />
                  ))
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EventCard({ event, idx, isJoined, onJoin, isJoining }) {
  const spotsLeft = (event?.max_participants || 8) - (event?.current_participants || 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card className="p-0 overflow-hidden">
        {event?.photos && event.photos.length > 0 && (
          <div className="h-48 bg-slate-100 overflow-hidden">
            <img src={event.photos[0]} alt="Event" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">
              {event?.title || 'Group Meetup'}
            </h3>
            <Badge className="mt-1 bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100">
              {event?.language || 'N/A'}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Ages</p>
            <p className="font-medium text-slate-900">
              {event?.age_range_min || 18}-{event?.age_range_max || 35}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-fuchsia-600" />
            {event?.date ? format(new Date(event.date), 'EEEE, MMMM d') : 'TBD'}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-fuchsia-600" />
            {event?.time || 'TBD'}
          </div>
          {event?.venue_name && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-fuchsia-600" />
              {event.venue_name}, {event?.city || 'N/A'}
            </div>
          )}
          {event?.price && (
            <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-600">
              ₹{event.price} per person
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-sm">
            {event?.tables_assigned ? (
              <span className="text-emerald-600 font-medium">Groups assigned</span>
            ) : (
              <span className="text-slate-500">
                {`${event?.max_participants || 8} spot${(event?.max_participants || 8) > 1 ? 's' : ''}`}
              </span>
            )}
          </div>
          
          {isJoined ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Joined
            </Badge>
          ) : (
            <Button
              onClick={onJoin}
              disabled={isJoining || spotsLeft === 0}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 rounded-xl"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Join
            </Button>
          )}
        </div>
        </div>
      </Card>
    </motion.div>
  );
}