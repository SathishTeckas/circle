import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, ArrowLeft, Sparkles, Send, CheckCircle } from 'lucide-react';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function EventFeedback() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState(null);
  const [user, setUser] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    event_rating: 0,
    venue_rating: 0,
    matching_quality: 0,
    personality_mix_rating: 0,
    would_attend_again: null,
    met_compatible_people: null,
    connections_made: 0,
    preferred_group_size: '',
    age_diversity_preference: '',
    liked_participants: [],
    improvement_suggestions: '',
    favorite_aspects: []
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEventId(params.get('eventId'));
    
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const results = await base44.entities.GroupEvent.filter({ id: eventId }, '', 1);
      return results[0];
    },
    enabled: !!eventId
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      return await base44.entities.GroupParticipant.filter({ 
        event_id: eventId,
        status: 'confirmed'
      });
    },
    enabled: !!eventId
  });

  const { data: existingFeedback } = useQuery({
    queryKey: ['my-feedback', eventId, user?.id],
    queryFn: async () => {
      const results = await base44.entities.EventFeedback.filter({
        event_id: eventId,
        participant_id: user.id
      }, '', 1);
      return results[0];
    },
    enabled: !!eventId && !!user?.id
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.EventFeedback.create({
        event_id: eventId,
        participant_id: user.id,
        participant_name: user.full_name,
        ...formData
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
    }
  });

  const otherParticipants = participants.filter(p => p.user_id !== user?.id);

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const favoriteOptions = [
    'Venue atmosphere',
    'Conversation quality',
    'Group size',
    'Age diversity',
    'Similar interests',
    'Event timing',
    'Organizer support'
  ];

  if (!eventId || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (existingFeedback) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
        <Card className="p-8 text-center max-w-md" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#4ECDC4' }} />
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#2D3436' }}>Thank You!</h2>
          <p className="mb-6" style={{ color: '#636E72' }}>You've already submitted feedback for this event.</p>
          <Button
            onClick={() => window.location.href = createPageUrl('GroupEvents')}
            variant="outline"
            className="font-bold"
            style={{ borderColor: '#DFE6E9', color: '#2D3436' }}
          >
            Back to Events
          </Button>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Card className="p-8 text-center max-w-md" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#4ECDC4' }} />
            </motion.div>
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#2D3436' }}>Feedback Submitted!</h2>
            <p className="mb-6" style={{ color: '#636E72' }}>
              Thank you for helping us improve future events. Your insights will help us create better matches.
            </p>
            <Button
              onClick={() => window.location.href = createPageUrl('GroupEvents')}
              className="font-bold"
              style={{ background: '#FFD93D', color: '#2D3436' }}
            >
              Explore More Events
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-12" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)' }}>
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = createPageUrl('GroupEvents')}
            className="mb-4 hover:opacity-80"
            style={{ color: '#2D3436' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6" style={{ color: '#2D3436' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>Event Feedback</h1>
          </div>
          <p style={{ color: 'rgba(45,52,54,0.7)' }}>{event?.title}</p>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-lg mx-auto">
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <StarRating
              label="Overall Event Rating"
              value={formData.event_rating}
              onChange={(v) => setFormData({ ...formData, event_rating: v })}
            />

            <StarRating
              label="Venue Quality"
              value={formData.venue_rating}
              onChange={(v) => setFormData({ ...formData, venue_rating: v })}
            />

            <StarRating
              label="How Well Were Participants Matched?"
              value={formData.matching_quality}
              onChange={(v) => setFormData({ ...formData, matching_quality: v })}
            />

            <StarRating
              label="Personality Mix Rating"
              value={formData.personality_mix_rating}
              onChange={(v) => setFormData({ ...formData, personality_mix_rating: v })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Would you attend similar events?</Label>
              <RadioGroup
                value={formData.would_attend_again?.toString()}
                onValueChange={(v) => setFormData({ ...formData, would_attend_again: v === 'true' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="yes" />
                  <Label htmlFor="yes" className="font-normal cursor-pointer">Yes, definitely!</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no" className="font-normal cursor-pointer">Not really</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Did you meet compatible people?</Label>
              <RadioGroup
                value={formData.met_compatible_people?.toString()}
                onValueChange={(v) => setFormData({ ...formData, met_compatible_people: v === 'true' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="compatible-yes" />
                  <Label htmlFor="compatible-yes" className="font-normal cursor-pointer">Yes, made great connections</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="compatible-no" />
                  <Label htmlFor="compatible-no" className="font-normal cursor-pointer">Not really</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                How many meaningful connections did you make?
              </Label>
              <RadioGroup
                value={formData.connections_made.toString()}
                onValueChange={(v) => setFormData({ ...formData, connections_made: parseInt(v) })}
              >
                {[0, 1, 2, 3, 4, 5].map(num => (
                  <div key={num} className="flex items-center space-x-2">
                    <RadioGroupItem value={num.toString()} id={`conn-${num}`} />
                    <Label htmlFor={`conn-${num}`} className="font-normal cursor-pointer">
                      {num === 0 ? 'None' : num === 5 ? '5+' : num}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Preferred Group Size</Label>
              <RadioGroup
                value={formData.preferred_group_size}
                onValueChange={(v) => setFormData({ ...formData, preferred_group_size: v })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="smaller" id="smaller" />
                  <Label htmlFor="smaller" className="font-normal cursor-pointer">Smaller groups (4-6)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="same" id="same" />
                  <Label htmlFor="same" className="font-normal cursor-pointer">This size was perfect</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="larger" id="larger" />
                  <Label htmlFor="larger" className="font-normal cursor-pointer">Larger groups (10+)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Age Diversity</Label>
              <RadioGroup
                value={formData.age_diversity_preference}
                onValueChange={(v) => setFormData({ ...formData, age_diversity_preference: v })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="more_similar" id="more-similar" />
                  <Label htmlFor="more-similar" className="font-normal cursor-pointer">Prefer closer age ranges</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="good_mix" id="good-mix" />
                  <Label htmlFor="good-mix" className="font-normal cursor-pointer">This mix was great</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="more_diverse" id="more-diverse" />
                  <Label htmlFor="more-diverse" className="font-normal cursor-pointer">More age diversity</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {otherParticipants.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <Label className="text-sm font-medium text-slate-700">
                Who did you connect with? (Select all that apply)
              </Label>
              <div className="space-y-2">
                {otherParticipants.map(participant => (
                  <div key={participant.user_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={participant.user_id}
                      checked={formData.liked_participants.includes(participant.user_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            liked_participants: [...formData.liked_participants, participant.user_id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            liked_participants: formData.liked_participants.filter(id => id !== participant.user_id)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={participant.user_id} className="font-normal cursor-pointer">
                      {participant.user_name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Label className="text-sm font-medium text-slate-700">
              What did you like most? (Select all that apply)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {favoriteOptions.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={formData.favorite_aspects.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          favorite_aspects: [...formData.favorite_aspects, option]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          favorite_aspects: formData.favorite_aspects.filter(a => a !== option)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={option} className="font-normal cursor-pointer text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <Label className="text-sm font-medium text-slate-700">
              Any suggestions for improvement?
            </Label>
            <Textarea
              placeholder="Share your thoughts on how we can make events better..."
              value={formData.improvement_suggestions}
              onChange={(e) => setFormData({ ...formData, improvement_suggestions: e.target.value })}
              className="min-h-24 rounded-xl"
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !formData.event_rating || !formData.matching_quality}
            className="w-full h-12 rounded-xl font-bold"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            <Send className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </Card>
      </div>
    </div>
  );
}