import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Users, TrendingUp, MessageSquare, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminFeedbackView() {
  const [eventId, setEventId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEventId(params.get('eventId'));
  }, []);

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const results = await base44.entities.GroupEvent.filter({ id: eventId }, '', 1);
      return results[0];
    },
    enabled: !!eventId
  });

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['event-feedback', eventId],
    queryFn: async () => {
      return await base44.entities.EventFeedback.filter({ event_id: eventId }, '-created_date', 100);
    },
    enabled: !!eventId
  });

  if (!eventId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No event selected</p>
        </div>
      </div>
    );
  }

  const avgEventRating = feedback.length > 0 
    ? (feedback.reduce((sum, f) => sum + f.event_rating, 0) / feedback.length).toFixed(1)
    : 0;

  const avgMatchingQuality = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.matching_quality, 0) / feedback.length).toFixed(1)
    : 0;

  const avgPersonalityMix = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.personality_mix_rating || 0), 0) / feedback.length).toFixed(1)
    : 0;

  const wouldAttendAgainCount = feedback.filter(f => f.would_attend_again).length;
  const metCompatibleCount = feedback.filter(f => f.met_compatible_people).length;

  const avgConnections = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.connections_made || 0), 0) / feedback.length).toFixed(1)
    : 0;

  const groupSizePreferences = {
    smaller: feedback.filter(f => f.preferred_group_size === 'smaller').length,
    same: feedback.filter(f => f.preferred_group_size === 'same').length,
    larger: feedback.filter(f => f.preferred_group_size === 'larger').length
  };

  const ageDiversityPreferences = {
    more_similar: feedback.filter(f => f.age_diversity_preference === 'more_similar').length,
    good_mix: feedback.filter(f => f.age_diversity_preference === 'good_mix').length,
    more_diverse: feedback.filter(f => f.age_diversity_preference === 'more_diverse').length
  };

  const allFavorites = feedback.flatMap(f => f.favorite_aspects || []);
  const favoriteCounts = {};
  allFavorites.forEach(aspect => {
    favoriteCounts[aspect] = (favoriteCounts[aspect] || 0) + 1;
  });
  const topFavorites = Object.entries(favoriteCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const StarRating = ({ value }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={cn(
            "w-5 h-5",
            star <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = createPageUrl('AdminGroups')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Event Feedback</h1>
              <p className="text-sm text-slate-600">{event?.title} - {feedback.length} responses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <Card className="p-6 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </Card>
        ) : feedback.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">No feedback yet</h3>
            <p className="text-slate-600">Participants will be able to submit feedback after the event</p>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Event Rating</p>
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{avgEventRating}/5</p>
                <StarRating value={parseFloat(avgEventRating)} />
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Matching Quality</p>
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{avgMatchingQuality}/5</p>
                <StarRating value={parseFloat(avgMatchingQuality)} />
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Personality Mix</p>
                  <TrendingUp className="w-4 h-4 text-fuchsia-600" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{avgPersonalityMix}/5</p>
                <StarRating value={parseFloat(avgPersonalityMix)} />
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Avg Connections</p>
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{avgConnections}</p>
                <p className="text-xs text-slate-500 mt-1">per person</p>
              </Card>
            </div>

            {/* Sentiment Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Return Intent</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Would attend again</span>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {wouldAttendAgainCount}/{feedback.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Met compatible people</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      {metCompatibleCount}/{feedback.length}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Top Liked Aspects</h3>
                <div className="space-y-2">
                  {topFavorites.map(([aspect, count]) => (
                    <div key={aspect} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{aspect}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Preferences */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Group Size Preference</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Smaller (4-6)</span>
                    <Badge variant="outline">{groupSizePreferences.smaller}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Perfect as is</span>
                    <Badge className="bg-emerald-100 text-emerald-700">{groupSizePreferences.same}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Larger (10+)</span>
                    <Badge variant="outline">{groupSizePreferences.larger}</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Age Diversity Preference</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Closer ages</span>
                    <Badge variant="outline">{ageDiversityPreferences.more_similar}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Good mix</span>
                    <Badge className="bg-emerald-100 text-emerald-700">{ageDiversityPreferences.good_mix}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">More diversity</span>
                    <Badge variant="outline">{ageDiversityPreferences.more_diverse}</Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Individual Feedback */}
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Individual Feedback ({feedback.length})</h3>
              <div className="space-y-4">
                {feedback.map((f, idx) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-900">{f.participant_name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-amber-100 text-amber-700">
                            {f.event_rating}⭐ Event
                          </Badge>
                          <Badge className="bg-violet-100 text-violet-700">
                            {f.matching_quality}⭐ Match
                          </Badge>
                          {f.connections_made > 0 && (
                            <Badge className="bg-rose-100 text-rose-700">
                              {f.connections_made} connection{f.connections_made !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {f.improvement_suggestions && (
                      <div className="mt-2 p-3 bg-white rounded border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Suggestions:</p>
                        <p className="text-sm text-slate-700">{f.improvement_suggestions}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}