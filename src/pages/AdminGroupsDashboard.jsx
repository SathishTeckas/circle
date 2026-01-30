import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Users, Calendar, Clock, MapPin, 
  Mail, Phone, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function AdminGroupsDashboard() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEventId(params.get('eventId'));
  }, []);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['group-event', eventId],
    queryFn: async () => {
      const results = await base44.asServiceRole.entities.GroupEvent.filter({ id: eventId }, '', 1);
      return results[0];
    },
    enabled: !!eventId
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      return await base44.entities.GroupParticipant.filter({ event_id: eventId }, '-created_date', 500);
    },
    enabled: !!eventId
  });

  // No need to fetch user details separately - they come with GroupParticipant

  const selectParticipantsMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('selectGroupEventParticipants', { eventId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });
    }
  });

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="text-center">
          <p style={{ color: '#636E72' }}>No event selected</p>
        </div>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const selectedParticipants = participants.filter(p => p.status === 'confirmed');
  const registeredParticipants = participants.filter(p => p.status === 'registered');
  const notSelectedParticipants = participants.filter(p => p.status === 'not_selected');

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 md:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = createPageUrl('AdminGroups')}
                className="rounded-xl"
                style={{ color: '#2D3436' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold" style={{ color: '#2D3436' }}>{event?.title || 'Group Event'}</h1>
                <p className="text-sm" style={{ color: '#636E72' }}>{participants.length} total registrations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {participantsLoading && (
          <Card className="p-6 flex items-center justify-center" style={{ background: '#FFFFFF', border: 'none' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FFD93D', borderTopColor: 'transparent' }} />
          </Card>
        )}

        {/* Event Details */}
        <Card className="p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(45, 52, 54, 0.08)', border: 'none' }}>
          <h2 className="font-bold mb-4" style={{ color: '#2D3436' }}>Event Details</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg" style={{ background: '#FFF3B8' }}>
              <p className="text-sm mb-1" style={{ color: '#636E72' }}>Total Registrations</p>
              <p className="text-3xl font-extrabold" style={{ color: '#2D3436' }}>{participants.length}</p>
              <p className="text-xs mt-1" style={{ color: '#636E72' }}>of {event?.max_participants || '∞'} max</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: '#4ECDC4' }}>
             <p className="text-sm mb-1" style={{ color: '#2D3436' }}>Total Amount Collected</p>
             <p className="text-3xl font-extrabold" style={{ color: '#2D3436' }}>₹{event?.total_amount_collected ? event.total_amount_collected.toFixed(0) : (participants.length * (event?.price || 0)).toFixed(0)}</p>
             <p className="text-xs mt-1" style={{ color: 'rgba(45,52,54,0.7)' }}>from {participants.filter(p => p.payment_status === 'completed').length} paid registrations</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: '#FFB347' }}>
              <p className="text-sm mb-1" style={{ color: '#2D3436' }}>Event Status</p>
              <Badge 
                className="font-bold"
                style={{ 
                  background: event?.status === 'confirmed' ? '#4ECDC4' : event?.status === 'completed' ? '#A8A4FF' : '#74B9FF',
                  color: event?.status === 'completed' ? '#FFFFFF' : '#2D3436'
                }}
              >
                {event?.status?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">Date & Time</p>
              <p className="font-medium text-slate-900 mt-1">
                {event?.date ? format(new Date(event.date), 'EEE, MMM d') : 'TBD'}
              </p>
              <p className="text-sm text-slate-600">{event?.time}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Location</p>
              <p className="font-medium text-slate-900 mt-1">{event?.venue_name}</p>
              <p className="text-sm text-slate-600">{event?.area}, {event?.city}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Details</p>
              <p className="font-medium text-slate-900 mt-1">{event?.language}</p>
              <p className="text-sm text-slate-600">Ages {event?.age_range_min}-{event?.age_range_max}</p>
            </div>
          </div>

          {event?.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600">Description</p>
              <p className="text-slate-900 mt-1">{event.description}</p>
            </div>
          )}
        </Card>

        {/* Action Button */}
        {!event?.tables_assigned && registeredParticipants.length > 0 && (
          <Button
            onClick={() => selectParticipantsMutation.mutate()}
            disabled={selectParticipantsMutation.isPending}
            className="w-full h-12 rounded-xl font-bold"
            style={{ background: '#FFD93D', color: '#2D3436' }}
          >
            {selectParticipantsMutation.isPending ? 'Selecting Participants...' : 'Select Participants & Send Refunds'}
          </Button>
        )}

        {event?.tables_assigned && (
          <Card className="p-4" style={{ background: '#4ECDC4', border: 'none' }}>
            <p className="font-bold" style={{ color: '#2D3436' }}>✓ Tables assigned on {event.assignment_date ? format(new Date(event.assignment_date), 'PPP') : 'N/A'}</p>
          </Card>
        )}

        {/* Registered Participants */}
        {registeredParticipants.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Waiting for Assignment ({registeredParticipants.length})
            </h2>
            <div className="space-y-3">
              {registeredParticipants.map((participant, idx) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">{participant.user_name}</p>
                    <p className="text-sm text-slate-600">Registered {format(new Date(participant.created_date), 'PPp')}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                    Pending
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Selected Participants */}
        {selectedParticipants.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Selected for Event ({selectedParticipants.length})
            </h2>
            <div className="space-y-3">
              {selectedParticipants.map((participant, idx) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">{participant.user_name}</p>
                    {participant.table_number && (
                      <p className="text-sm text-emerald-700">Table {participant.table_number}</p>
                    )}
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    Confirmed
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Not Selected / Refunded */}
        {notSelectedParticipants.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              Refunded ({notSelectedParticipants.length})
            </h2>
            <div className="space-y-3">
              {notSelectedParticipants.map((participant, idx) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">{participant.user_name}</p>
                    <p className="text-sm text-slate-600">Full refund processed</p>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700">
                    Refunded
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {!participantsLoading && participants.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No registrations yet</p>
          </Card>
        )}

        {!participantsLoading && participants.length > 0 && selectedParticipants.length === 0 && registeredParticipants.length === 0 && notSelectedParticipants.length === 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4">All Participants ({participants.length})</h2>
            <div className="space-y-3">
              {participants.map((participant, idx) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">{participant.user_name}</p>
                    <p className="text-sm text-slate-600">Status: {participant.status || 'registered'}</p>
                  </div>
                  <Badge variant="outline">
                    {participant.status || 'registered'}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}