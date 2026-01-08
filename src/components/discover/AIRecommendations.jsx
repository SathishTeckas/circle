import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CompanionCard from '../companion/CompanionCard';
import { Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIRecommendations({ user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const { data: availabilities = [] } = useQuery({
    queryKey: ['all-availabilities'],
    queryFn: () => base44.entities.Availability.filter({ status: 'available' }, '-created_date', 50),
    enabled: !!user
  });

  const { data: pastBookings = [] } = useQuery({
    queryKey: ['user-past-bookings', user?.id],
    queryFn: () => base44.entities.Booking.filter({ seeker_id: user.id, status: 'completed' }, '-created_date', 20),
    enabled: !!user?.id
  });

  useEffect(() => {
    if (!user || !availabilities.length) return;

    const getRecommendations = async () => {
      try {
        setLoading(true);
        
        const userProfile = {
          interests: user.interests || [],
          hobbies: user.hobbies || [],
          personality: user.personality_traits || [],
          preferred_gender: user.preferred_gender,
          preferred_areas: user.preferred_areas || [],
          city: user.city,
          past_companions: pastBookings.map(b => b.companion_name).filter(Boolean)
        };

        const companions = availabilities.map(a => ({
          id: a.companion_id,
          name: a.companion_name,
          gender: a.gender,
          interests: a.interests || [],
          languages: a.languages || [],
          city: a.city,
          area: a.area,
          price: a.price_per_hour
        }));

        const prompt = `You are a companion matching AI. Analyze the user profile and available companions, then recommend the top 5 most compatible companions with compatibility scores (0-100).

User Profile:
${JSON.stringify(userProfile, null, 2)}

Available Companions:
${JSON.stringify(companions, null, 2)}

Consider:
- Shared interests and hobbies
- Personality compatibility
- Location preferences
- Gender preferences
- Language compatibility
- Price range fit
- Avoid recently booked companions for variety

Return ONLY the top 5 companion IDs with scores and brief reason.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    companion_id: { type: "string" },
                    compatibility_score: { type: "number" },
                    reason: { type: "string" }
                  }
                }
              }
            }
          }
        });

        const recommended = result.recommendations.map(rec => {
          const availability = availabilities.find(a => a.companion_id === rec.companion_id);
          return {
            ...availability,
            compatibility_score: rec.compatibility_score,
            compatibility_reason: rec.reason
          };
        }).filter(Boolean);

        setRecommendations(recommended);
      } catch (error) {
        console.error('Failed to get AI recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    getRecommendations();
  }, [user, availabilities, pastBookings]);

  if (!user || loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Recommendations</h3>
            <p className="text-sm text-slate-600">Analyzing your preferences...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/80 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Recommended For You</h3>
          <p className="text-sm text-slate-600">AI-powered matches based on your preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((availability, idx) => (
          <motion.div
            key={availability.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="relative">
              <Badge className="absolute top-4 right-4 z-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                <TrendingUp className="w-3 h-3 mr-1" />
                {availability.compatibility_score}% Match
              </Badge>
              <CompanionCard 
                availability={availability} 
                showCompatibility={true}
                compatibilityReason={availability.compatibility_reason}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}