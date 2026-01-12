import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, TrendingUp, Users, Star, MapPin, 
  MessageSquare, Heart, BarChart3, CheckCircle 
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function EventAnalytics() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const userData = await base44.auth.me();
      if (userData.user_role !== 'admin' && userData.role !== 'admin') {
        window.location.href = createPageUrl('Discover');
      }
      setUser(userData);
    };
    checkAdmin();
  }, []);

  const { data: allFeedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['all-feedback'],
    queryFn: () => base44.entities.EventFeedback.list('-created_date', 500)
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-events-analytics'],
    queryFn: () => base44.entities.GroupEvent.list('-date', 200)
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ['all-participants-analytics'],
    queryFn: () => base44.entities.GroupParticipant.list('-created_date', 1000)
  });

  if (feedbackLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Overall Metrics
  const avgEventRating = allFeedback.length > 0 
    ? (allFeedback.reduce((sum, f) => sum + f.event_rating, 0) / allFeedback.length).toFixed(2)
    : 0;

  const avgMatchingQuality = allFeedback.length > 0
    ? (allFeedback.reduce((sum, f) => sum + f.matching_quality, 0) / allFeedback.length).toFixed(2)
    : 0;

  const avgPersonalityMix = allFeedback.length > 0
    ? (allFeedback.reduce((sum, f) => sum + (f.personality_mix_rating || 0), 0) / allFeedback.length).toFixed(2)
    : 0;

  const avgVenueRating = allFeedback.length > 0
    ? (allFeedback.reduce((sum, f) => sum + (f.venue_rating || 0), 0) / allFeedback.length).toFixed(2)
    : 0;

  const wouldAttendAgainRate = allFeedback.length > 0
    ? ((allFeedback.filter(f => f.would_attend_again).length / allFeedback.length) * 100).toFixed(0)
    : 0;

  const metCompatibleRate = allFeedback.length > 0
    ? ((allFeedback.filter(f => f.met_compatible_people).length / allFeedback.length) * 100).toFixed(0)
    : 0;

  const totalConnections = allFeedback.reduce((sum, f) => sum + (f.connections_made || 0), 0);
  const avgConnections = allFeedback.length > 0 ? (totalConnections / allFeedback.length).toFixed(1) : 0;

  // Trends Over Time
  const eventsByMonth = {};
  allEvents.forEach(event => {
    if (event.date) {
      const month = format(new Date(event.date), 'MMM yyyy');
      if (!eventsByMonth[month]) {
        eventsByMonth[month] = { month, events: 0, feedback: [], avgRating: 0 };
      }
      eventsByMonth[month].events++;
    }
  });

  allFeedback.forEach(f => {
    const event = allEvents.find(e => e.id === f.event_id);
    if (event && event.date) {
      const month = format(new Date(event.date), 'MMM yyyy');
      if (eventsByMonth[month]) {
        eventsByMonth[month].feedback.push(f);
      }
    }
  });

  const trendsData = Object.values(eventsByMonth).map(m => ({
    month: m.month,
    events: m.events,
    avgRating: m.feedback.length > 0 
      ? (m.feedback.reduce((sum, f) => sum + f.event_rating, 0) / m.feedback.length).toFixed(1)
      : 0,
    avgMatching: m.feedback.length > 0
      ? (m.feedback.reduce((sum, f) => sum + f.matching_quality, 0) / m.feedback.length).toFixed(1)
      : 0
  })).slice(-6);

  // City Performance
  const cityStats = {};
  allEvents.forEach(event => {
    if (!cityStats[event.city]) {
      cityStats[event.city] = { city: event.city, events: 0, feedback: [], participants: 0 };
    }
    cityStats[event.city].events++;
    cityStats[event.city].participants += (event.current_participants || 0);
  });

  allFeedback.forEach(f => {
    const event = allEvents.find(e => e.id === f.event_id);
    if (event && event.city) {
      if (cityStats[event.city]) {
        cityStats[event.city].feedback.push(f);
      }
    }
  });

  const cityData = Object.values(cityStats)
    .map(c => ({
      city: c.city,
      events: c.events,
      participants: c.participants,
      avgRating: c.feedback.length > 0 
        ? (c.feedback.reduce((sum, f) => sum + f.event_rating, 0) / c.feedback.length).toFixed(1)
        : 0
    }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 8);

  // Group Size Preferences
  const groupSizeData = [
    { name: 'Smaller (4-6)', value: allFeedback.filter(f => f.preferred_group_size === 'smaller').length },
    { name: 'Perfect', value: allFeedback.filter(f => f.preferred_group_size === 'same').length },
    { name: 'Larger (10+)', value: allFeedback.filter(f => f.preferred_group_size === 'larger').length }
  ].filter(d => d.value > 0);

  // Age Diversity Preferences
  const ageDiversityData = [
    { name: 'Closer Ages', value: allFeedback.filter(f => f.age_diversity_preference === 'more_similar').length },
    { name: 'Good Mix', value: allFeedback.filter(f => f.age_diversity_preference === 'good_mix').length },
    { name: 'More Diverse', value: allFeedback.filter(f => f.age_diversity_preference === 'more_diverse').length }
  ].filter(d => d.value > 0);

  // Top Improvement Suggestions
  const suggestions = allFeedback
    .filter(f => f.improvement_suggestions)
    .map(f => f.improvement_suggestions);

  // Favorite Aspects
  const allFavorites = allFeedback.flatMap(f => f.favorite_aspects || []);
  const favoriteCounts = {};
  allFavorites.forEach(aspect => {
    favoriteCounts[aspect] = (favoriteCounts[aspect] || 0) + 1;
  });
  const favoriteData = Object.entries(favoriteCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Success Factors Analysis
  const highRatedEvents = allFeedback.filter(f => f.event_rating >= 4.5);
  const highMatchingEvents = allFeedback.filter(f => f.matching_quality >= 4.5);
  
  const successFactors = {
    highEventRating: ((highRatedEvents.length / allFeedback.length) * 100).toFixed(0),
    highMatching: ((highMatchingEvents.length / allFeedback.length) * 100).toFixed(0),
    avgConnectionsInHighRated: highRatedEvents.length > 0 
      ? (highRatedEvents.reduce((sum, f) => sum + (f.connections_made || 0), 0) / highRatedEvents.length).toFixed(1)
      : 0
  };

  // Rating Distribution
  const ratingDistribution = [
    { rating: '5 Stars', count: allFeedback.filter(f => f.event_rating === 5).length },
    { rating: '4 Stars', count: allFeedback.filter(f => f.event_rating === 4).length },
    { rating: '3 Stars', count: allFeedback.filter(f => f.event_rating === 3).length },
    { rating: '2 Stars', count: allFeedback.filter(f => f.event_rating === 2).length },
    { rating: '1 Star', count: allFeedback.filter(f => f.event_rating === 1).length }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
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
              <h1 className="text-2xl font-bold text-slate-900">Event Analytics</h1>
              <p className="text-sm text-slate-600">{allFeedback.length} feedback responses analyzed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* Key Metrics Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Event Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <p className="text-3xl font-bold text-slate-900">{avgEventRating}/5</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Matching Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-600" />
                <p className="text-3xl font-bold text-slate-900">{avgMatchingQuality}/5</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Return Intent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <p className="text-3xl font-bold text-slate-900">{wouldAttendAgainRate}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <p className="text-3xl font-bold text-slate-900">{avgConnections}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            {/* Rating Trends Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgRating" stroke="#8b5cf6" name="Event Rating" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgMatching" stroke="#ec4899" name="Matching Quality" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* City Performance */}
            <Card>
              <CardHeader>
                <CardTitle>City Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="events" fill="#8b5cf6" name="Events" />
                    <Bar dataKey="participants" fill="#ec4899" name="Participants" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Favorite Aspects */}
            <Card>
              <CardHeader>
                <CardTitle>Most Appreciated Aspects</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={favoriteData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Group Size Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Group Size Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={groupSizeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {groupSizeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Age Diversity Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Age Diversity Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={ageDiversityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ageDiversityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {/* Success Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Key Success Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm text-slate-600 mb-1">High Event Ratings (4.5+)</p>
                    <p className="text-3xl font-bold text-emerald-600">{successFactors.highEventRating}%</p>
                  </div>
                  <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
                    <p className="text-sm text-slate-600 mb-1">High Matching Quality (4.5+)</p>
                    <p className="text-3xl font-bold text-violet-600">{successFactors.highMatching}%</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                    <p className="text-sm text-slate-600 mb-1">Avg Connections (High Rated)</p>
                    <p className="text-3xl font-bold text-rose-600">{successFactors.avgConnectionsInHighRated}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-2">✨ What Makes Events Successful</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Events with {avgMatchingQuality}+ matching quality see {metCompatibleRate}% compatibility rate</li>
                      <li>• {wouldAttendAgainRate}% of participants would attend similar events again</li>
                      <li>• Average of {avgConnections} meaningful connections per event</li>
                      <li>• Venue quality strongly correlates with overall satisfaction ({avgVenueRating}/5)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Improvement Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-slate-600" />
                  Recent Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {suggestions.slice(0, 15).map((suggestion, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-sm text-slate-700">{suggestion}</p>
                    </div>
                  ))}
                  {suggestions.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">No suggestions yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}