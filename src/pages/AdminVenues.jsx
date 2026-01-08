import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { 
  Building, Plus, MapPin, Shield, Camera, Trash2,
  ArrowLeft, CheckCircle, XCircle, Pencil, Upload, X
} from 'lucide-react';
import { motion } from 'framer-motion';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
const AREAS = [
  'Adambakkam', 'Adyar', 'Alandur', 'Alwarpet', 'Ambattur', 'Anna Nagar', 'Arumbakkam', 'Ashok Nagar',
  'Avadi', 'Ayanavaram', 'Besant Nagar', 'Chetpet', 'Choolaimedu', 'Chromepet', 'Egmore', 'Ekkaduthangal',
  'George Town (Parry\'s)', 'Gopalapuram', 'Guindy', 'Injambakkam', 'K.K. Nagar', 'Kilpauk', 'Kodambakkam',
  'Kolathur', 'Korattur', 'Kotturpuram', 'Koyambedu', 'Madhavaram', 'Madipakkam', 'Mandaveli', 'Medavakkam',
  'Meenambakkam', 'Mogappair', 'Mylapore', 'Nandanam', 'Nanganallur', 'Navalur', 'Neelankarai', 'Nungambakkam',
  'Palavakkam', 'Pallavaram', 'Pallikaranai', 'Perambur', 'Perungudi', 'Poonamallee', 'Porur', 'Purasawalkam',
  'R.A. Puram', 'Red Hills', 'Royapettah', 'Royapuram', 'Saidapet', 'Santhome', 'Selaiyur', 'Sholinganallur',
  'St. Thomas Mount', 'T. Nagar', 'Tambaram', 'Teynampet', 'Thiruvanmiyur', 'Thiruvottiyur', 'Thoraipakkam',
  'Tondiarpet', 'Triplicane', 'Vadapalani', 'Valasaravakkam', 'Velachery', 'Villivakkam', 'Virugambakkam',
  'Washermanpet', 'West Mambalam'
];

export default function AdminVenues() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    area: '',
    type: 'restaurant',
    has_cctv: false,
    capacity: '',
    photo_url: '',
    google_map_link: ''
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

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['admin-venues'],
    queryFn: () => base44.entities.Venue.list('-created_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingVenue) {
        await base44.entities.Venue.update(editingVenue.id, {
          ...formData,
          capacity: parseInt(formData.capacity) || 0
        });
      } else {
        await base44.entities.Venue.create({
          ...formData,
          capacity: parseInt(formData.capacity) || 0,
          verified: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      setShowForm(false);
      setEditingVenue(null);
      setFormData({ name: '', address: '', city: '', area: '', type: 'restaurant', has_cctv: false, capacity: '', photo_url: '', google_map_link: '' });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ venueId, verified }) => {
      await base44.entities.Venue.update(venueId, { verified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (venueId) => {
      await base44.entities.Venue.delete(venueId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
    }
  });

  const canSubmit = formData.name && formData.address && formData.city;

  const handleEdit = (venue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name || '',
      address: venue.address || '',
      city: venue.city || '',
      area: venue.area || '',
      type: venue.type || 'restaurant',
      has_cctv: venue.has_cctv || false,
      capacity: venue.capacity?.toString() || '',
      photo_url: venue.photo_url || '',
      google_map_link: venue.google_map_link || ''
    });
    setShowForm(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    } catch (error) {
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
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
                <h1 className="text-2xl font-bold text-slate-900">Venue Management</h1>
                <p className="text-sm text-slate-600">{venues.length} registered venues</p>
              </div>
            </div>

            <Sheet open={showForm} onOpenChange={setShowForm}>
              <SheetTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Venue
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</SheetTitle>
                </SheetHeader>

                <div className="space-y-4 mt-6 pb-6">
                  <div>
                    <Label>Venue Name</Label>
                    <Input
                      placeholder="e.g., The Coffee House"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input
                      placeholder="Full address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1"
                    />
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
                    <Label>Area</Label>
                    <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {AREAS.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Venue Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="lounge">Lounge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      placeholder="Maximum guests"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Venue Photo</Label>
                    
                    {formData.photo_url ? (
                      <div className="mt-1 relative">
                        <img 
                          src={formData.photo_url} 
                          alt="Venue" 
                          className="w-full h-40 object-cover rounded-xl"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => setFormData({ ...formData, photo_url: '' })}
                          className="absolute top-2 right-2 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="mt-1 flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        {uploading ? (
                          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600">Click to upload photo</p>
                            <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <Label>Google Map Link</Label>
                    <Input
                      placeholder="https://maps.google.com/..."
                      value={formData.google_map_link}
                      onChange={(e) => setFormData({ ...formData, google_map_link: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-slate-900">Has CCTV</p>
                        <p className="text-sm text-slate-600">Safety monitoring available</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.has_cctv}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_cctv: checked })}
                      className="data-[state=checked]:bg-violet-600"
                    />
                  </div>

                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!canSubmit || createMutation.isPending}
                    className="w-full h-12 bg-violet-600 hover:bg-violet-700 rounded-xl"
                  >
                    {createMutation.isPending ? (editingVenue ? 'Updating...' : 'Adding...') : (editingVenue ? 'Update Venue' : 'Add Venue')}
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
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-16">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">No venues yet</h3>
            <p className="text-slate-600">Add verified venues for safe meetups</p>
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map((venue, idx) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{venue.name}</h3>
                        <Badge variant="outline" className="capitalize">{venue.type}</Badge>
                        {venue.verified ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        {venue.address}
                      </div>
                      
                      <p className="text-sm text-slate-500">
                        {venue.area}, {venue.city} • Capacity: {venue.capacity || 'N/A'}
                      </p>

                      <div className="flex gap-2 mt-2">
                        {venue.has_cctv && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <Camera className="w-3 h-3 mr-1" />
                            CCTV Monitored
                          </Badge>
                        )}
                        {venue.google_map_link && (
                          <a 
                            href={venue.google_map_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-violet-600 hover:text-violet-700 underline"
                          >
                            View on Map
                          </a>
                        )}
                        {venue.photo_url && (
                          <a 
                            href={venue.photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-violet-600 hover:text-violet-700 underline"
                          >
                            View Photo
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!venue.verified && (
                        <Button
                          size="sm"
                          onClick={() => verifyMutation.mutate({ venueId: venue.id, verified: true })}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(venue)}
                        className="border-violet-200 text-violet-600 hover:bg-violet-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(venue.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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