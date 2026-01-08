import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, SlidersHorizontal, MapPin, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import CompanionCard from '@/components/companion/CompanionCard';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Miami', 'Seattle', 'Boston', 'Austin'];
const AREAS = ['Downtown', 'Midtown', 'Uptown', 'Westside', 'Eastside', 'Central'];

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    area: '',
    gender: '',
    priceMin: '',
    priceMax: '',
    language: '',
    minRating: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const LANGUAGES = [
    'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil',
    'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'
  ];

  const TIME_SLOTS = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['availabilities', filters, selectedDate, selectedTime],
    queryFn: async () => {
      const query = { status: 'available' };
      if (filters.city) query.city = filters.city;
      if (filters.area) query.area = filters.area;
      if (filters.gender) query.gender = filters.gender;
      if (selectedDate) query.date = format(selectedDate, 'yyyy-MM-dd');
      
      const results = await base44.entities.Availability.filter(query, '-created_date', 100);
      return results;
    }
  });

  const { data: companions = [] } = useQuery({
    queryKey: ['companions', availabilities],
    queryFn: async () => {
      const companionIds = [...new Set(availabilities.map(a => a.companion_id))];
      if (companionIds.length === 0) return [];
      const users = await Promise.all(
        companionIds.map(async (id) => {
          try {
            const result = await base44.entities.User.filter({ id });
            return result[0];
          } catch (e) {
            return null;
          }
        })
      );
      return users.filter(Boolean);
    },
    enabled: availabilities.length > 0
  });

  const filteredAvailabilities = availabilities.filter(a => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = a.companion_name?.toLowerCase().includes(query);
      const matchesArea = a.area?.toLowerCase().includes(query);
      const matchesCity = a.city?.toLowerCase().includes(query);
      if (!matchesName && !matchesArea && !matchesCity) return false;
    }
    if (selectedDate) {
      const availDate = new Date(a.date);
      if (availDate.toDateString() !== selectedDate.toDateString()) return false;
    }
    if (selectedTime && a.start_time) {
      const availStart = parseInt(a.start_time.split(':')[0]);
      const selectedHour = parseInt(selectedTime.split(':')[0]);
      const availEnd = parseInt(a.end_time?.split(':')[0] || '23');
      if (selectedHour < availStart || selectedHour >= availEnd) return false;
    }
    if (filters.priceMin && a.price_per_hour < Number(filters.priceMin)) return false;
    if (filters.priceMax && a.price_per_hour > Number(filters.priceMax)) return false;
    if (filters.language && !a.languages?.includes(filters.language)) return false;
    if (filters.minRating) {
      const companion = companions.find(c => c?.id === a.companion_id);
      const rating = companion?.average_rating || 0;
      if (rating < parseFloat(filters.minRating)) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({ city: '', area: '', gender: '', priceMin: '', priceMax: '', language: '', minRating: '' });
    setSelectedDate(null);
    setSelectedTime('');
    setSearchQuery('');
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (selectedDate ? 1 : 0) + (selectedTime ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-30">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Discover</h1>
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>
            
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "h-12 px-4 rounded-xl border-slate-200 relative",
                    activeFilterCount > 0 && "border-violet-500 bg-violet-50"
                  )}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl">Filters</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6 overflow-y-auto pb-24">
                  {/* Date */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-12 justify-start rounded-xl">
                          <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Time</label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Any time</SelectItem>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">City</label>
                    <Select value={filters.city} onValueChange={(v) => setFilters({ ...filters, city: v })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>All cities</SelectItem>
                        {CITIES.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Area */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Area</label>
                    <Select value={filters.area} onValueChange={(v) => setFilters({ ...filters, area: v })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="All areas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>All areas</SelectItem>
                        {AREAS.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Gender</label>
                    <Select value={filters.gender} onValueChange={(v) => setFilters({ ...filters, gender: v })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Any gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Any gender</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Price Range (₹/hour)</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="Min ₹"
                        value={filters.priceMin}
                        onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                      <Input
                        type="number"
                        placeholder="Max ₹"
                        value={filters.priceMax}
                        onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Language</label>
                    <Select value={filters.language} onValueChange={(v) => setFilters({ ...filters, language: v })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Any language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Any language</SelectItem>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Minimum Rating */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Minimum Rating</label>
                    <Select value={filters.minRating} onValueChange={(v) => setFilters({ ...filters, minRating: v })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Any rating</SelectItem>
                        <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                        <SelectItem value="4.0">4.0+ ⭐</SelectItem>
                        <SelectItem value="3.5">3.5+ ⭐</SelectItem>
                        <SelectItem value="3.0">3.0+ ⭐</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-700"
                  >
                    Show Results
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {selectedDate && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {format(selectedDate, 'MMM d')}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDate(null)} />
                </Badge>
              )}
              {selectedTime && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {selectedTime}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTime('')} />
                </Badge>
              )}
              {filters.city && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.city}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, city: '' })} />
                </Badge>
              )}
              {filters.area && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.area}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, area: '' })} />
                </Badge>
              )}
              {filters.gender && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.gender}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, gender: '' })} />
                </Badge>
              )}
              {filters.language && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.language}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, language: '' })} />
                </Badge>
              )}
              {filters.minRating && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.minRating}+ ⭐
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, minRating: '' })} />
                </Badge>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  ₹{filters.priceMin || '0'}-{filters.priceMax || '∞'}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, priceMin: '', priceMax: '' })} />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredAvailabilities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No companions found</h3>
            <p className="text-slate-600 mb-4">Try adjusting your filters or search</p>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {filteredAvailabilities.length} companion{filteredAvailabilities.length !== 1 ? 's' : ''} available
            </p>
            {filteredAvailabilities.map((availability, idx) => (
              <motion.div
                key={availability.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <CompanionCard availability={availability} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}