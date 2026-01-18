import React, { useState, useEffect, useMemo } from 'react';
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
import { formatTime12Hour } from '../components/utils/timeFormat';
import CompanionCard from '@/components/companion/CompanionCard';
import NotificationBell from '@/components/layout/NotificationBell';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kochi'];

const AREAS_BY_CITY = {
  'Mumbai': ['Airoli', 'Andheri', 'Bandra', 'Belapur', 'Bhandup', 'Borivali', 'Byculla', 'Chembur', 'Churchgate', 'Colaba', 'Cuffe Parade', 'Dadar', 'Dahisar', 'Fort', 'Ghatkopar', 'Ghansoli', 'Goregaon', 'Govandi', 'Jogeshwari', 'Juhu', 'Kalbadevi', 'Kandivali', 'Kanjurmarg', 'Khar', 'Kharghar', 'Kurla', 'Lower Parel', 'Mahalaxmi', 'Malabar Hill', 'Malad', 'Mankhurd', 'Marine Lines', 'Matunga', 'Mulund', 'Nariman Point', 'Nerul', 'Panvel', 'Peddar Road', 'Powai', 'Santacruz', 'Sion', 'Tardeo', 'Vashi', 'Versova', 'Vidyavihar', 'Vikhroli', 'Vile Parle', 'Wadala', 'Worli'],
  'Delhi': ['Anand Vihar', 'Ashok Vihar', 'Azadpur', 'Chandni Chowk', 'Chanakyapuri', 'Chittaranjan Park', 'Civil Lines', 'Connaught Place', 'Defence Colony', 'Dwarka', 'East of Kailash', 'Gandhi Nagar', 'Greater Kailash', 'Green Park', 'Hauz Khas', 'Janakpuri', 'Kalkaji', 'Kamla Nagar', 'Karol Bagh', 'Lajpat Nagar', 'Laxmi Nagar', 'Lodhi Colony', 'Mayur Vihar', 'Model Town', 'Mehrauli', 'Moti Bagh', 'Mukherjee Nagar', 'Munirka', 'Naraina', 'Nehru Place', 'New Friends Colony', 'Nizamuddin', 'Okhla', 'Paharganj', 'Paschim Vihar', 'Patel Nagar', 'Pitampura', 'Pragati Maidan', 'Preet Vihar', 'Punjabi Bagh', 'Rajendra Nagar', 'Rajouri Garden', 'RK Puram', 'Rohini', 'Safdarjung Enclave', 'Saket', 'Sarita Vihar', 'Sarojini Nagar', 'Shahdara', 'Shalimar Bagh', 'South Extension', 'Tilak Nagar', 'Uttam Nagar', 'Vasant Kunj', 'Vasant Vihar', 'Vikas Puri'],
  'Bangalore': ['Banashankari', 'Banaswadi', 'Bannerghatta Road', 'Basavanagudi', 'Basaveshwaranagar', 'Bellandur', 'Benson Town', 'Brigade Road', 'Brookefield', 'BTM Layout', 'Commercial Street', 'Cooke Town', 'Cunningham Road', 'CV Raman Nagar', 'Domlur', 'Electronic City', 'Frazer Town', 'HBR Layout', 'Hebbal', 'Hennur', 'Hoodi', 'HSR Layout', 'Indiranagar', 'Jayanagar', 'JP Nagar', 'Kaggadasapura', 'Kalyan Nagar', 'Kammanahalli', 'Kengeri', 'Koramangala', 'KR Puram', 'Kumaraswamy Layout', 'Lavelle Road', 'Mahadevapura', 'Majestic', 'Malleshwaram', 'Marathahalli', 'MG Road', 'Nagarbhavi', 'Peenya', 'Rajajinagar', 'Ramamurthy Nagar', 'Richmond Town', 'RT Nagar', 'Sadashivnagar', 'Sahakar Nagar', 'Sarjapur', 'Shanthala Nagar', 'Shivaji Nagar', 'Thippasandra', 'Ulsoor', 'Varthur', 'Vijayanagar', 'Whitefield', 'Yelahanka', 'Yeshwanthpur'],
  'Hyderabad': ['Abids', 'Alwal', 'Amberpet', 'Ameerpet', 'Attapur', 'Bachupally', 'Banjara Hills', 'Begumpet', 'Bowenpally', 'Champapet', 'Chandanagar', 'Charminar', 'Dilsukhnagar', 'Falaknuma', 'Gachibowli', 'Habsiguda', 'Hitech City', 'Himayatnagar', 'Jubilee Hills', 'Kachiguda', 'Karkhana', 'Khairatabad', 'Kompally', 'Kondapur', 'Kothapet', 'Kukatpally', 'Lakdikapul', 'Langar Houz', 'LB Nagar', 'Lingampally', 'Madhapur', 'Malakpet', 'Malkajgiri', 'Manikonda', 'Marredpally', 'Masab Tank', 'Mehdipatnam', 'Miyapur', 'Musheerabad', 'Nagole', 'Nallakunta', 'Nanakramguda', 'Narayanguda', 'Nizampet', 'Panjagutta', 'Raidurg', 'Ramanthapur', 'Sainikpuri', 'Sanathnagar', 'Santoshnagar', 'Secunderabad', 'Somajiguda', 'SR Nagar', 'Tarnaka', 'Tolichowki', 'Trimulgherry', 'Uppal', 'Vanasthalipuram', 'Yousufguda'],
  'Chennai': ['Adambakkam', 'Adyar', 'Alandur', 'Alwarpet', 'Ambattur', 'Anna Nagar', 'Arumbakkam', 'Ashok Nagar', 'Avadi', 'Ayanavaram', 'Besant Nagar', 'Chetpet', 'Choolaimedu', 'Chromepet', 'Egmore', 'Ekkaduthangal', 'George Town', 'Gopalapuram', 'Guindy', 'Injambakkam', 'KK Nagar', 'Kilpauk', 'Kodambakkam', 'Kolathur', 'Korattur', 'Kotturpuram', 'Koyambedu', 'Madipakkam', 'Mandaveli', 'Medavakkam', 'Mogappair', 'Mylapore', 'Nandanam', 'Nanganallur', 'Navalur', 'Neelankarai', 'Nungambakkam', 'Palavakkam', 'Pallavaram', 'Pallikaranai', 'Perambur', 'Perungudi', 'Poonamallee', 'Porur', 'Purasawalkam', 'RA Puram', 'Royapettah', 'Royapuram', 'Saidapet', 'Santhome', 'Selaiyur', 'Sholinganallur', 'T Nagar', 'Tambaram', 'Teynampet', 'Thiruvanmiyur', 'Thiruvottiyur', 'Thoraipakkam', 'Tondiarpet', 'Triplicane', 'Vadapalani', 'Valasaravakkam', 'Velachery', 'Villivakkam', 'Virugambakkam', 'Washermanpet', 'West Mambalam'],
  'Kolkata': ['Alipore', 'Bagbazar', 'Baguiati', 'Ballygunge', 'Barasat', 'Behala', 'Beliaghata', 'Bhawanipore', 'Bidhannagar', 'Bowbazar', 'Camac Street', 'Chandni Chowk', 'Chitpur', 'College Street', 'Cossipore', 'Dalhousie', 'Dhakuria', 'Dum Dum', 'Elgin Road', 'Entally', 'Esplanade', 'Garia', 'Gariahat', 'Girish Park', 'Hati Bagan', 'Howrah', 'Jadavpur', 'Jodhpur Park', 'Kalighat', 'Kasba', 'Khidirpur', 'Lake Gardens', 'Lake Town', 'Lansdowne', 'Madhyamgram', 'Maniktala', 'Minto Park', 'Nagerbazar', 'Naktala', 'New Alipore', 'New Town', 'Park Circus', 'Park Street', 'Phoolbagan', 'Rajarhat', 'Santoshpur', 'Sealdah', 'Shakespeare Sarani', 'Shyambazar', 'Sovabazar', 'Tangra', 'Tollygunge', 'Ultadanga'],
  'Pune': ['Akurdi', 'Aundh', 'Balewadi', 'Baner', 'Bavdhan', 'Bhosari', 'Bibwewadi', 'Boat Club Road', 'Budhwar Peth', 'Camp', 'Chinchwad', 'Deccan Gymkhana', 'Dhanori', 'Hadapsar', 'Hinjewadi', 'Kalyani Nagar', 'Karve Nagar', 'Katraj', 'Kharadi', 'Kondhwa', 'Koregaon Park', 'Kothrud', 'Law College Road', 'Magarpatta', 'Model Colony', 'Mundhwa', 'Narayan Peth', 'Nigdi', 'Pashan', 'Pimpri', 'Pimple Gurav', 'Pimple Nilakh', 'Pimple Saudagar', 'Prabhat Road', 'Sadashiv Peth', 'Sahakar Nagar', 'Salisbury Park', 'Sangvi', 'Shivaji Nagar', 'Sinhagad Road', 'Swargate', 'Viman Nagar', 'Vishrantwadi', 'Wagholi', 'Wakad', 'Wanowrie', 'Warje', 'Yerwada'],
  'Ahmedabad': ['Ambawadi', 'Amraiwadi', 'Ashram Road', 'Aslali', 'Astodia', 'Bapunagar', 'Behrampura', 'Bhadra', 'Bodakdev', 'Bopal', 'C G Road', 'Chandkheda', 'Changodar', 'Dariapur', 'Drive In Road', 'Ellis Bridge', 'Ghatlodia', 'Ghodasar', 'Gota', 'Gurukul', 'Hatkeshwar', 'Isanpur', 'Jamalpur', 'Jodhpur', 'Juhapura', 'Kalupur', 'Khadia', 'Khanpur', 'Khokhra', 'Maninagar', 'Memnagar', 'Motera', 'Naranpura', 'Naroda', 'Navrangpura', 'Nikol', 'Odhav', 'Paldi', 'Prahlad Nagar', 'Ranip', 'Sabarmati', 'Sarkhej', 'Satellite', 'Shahibaug', 'Shahpur', 'Shela', 'Sola', 'South Bopal', 'Thaltej', 'Usmanpura', 'Vastral', 'Vastrapur', 'Vatva', 'Vejalpur'],
  'Jaipur': ['Adarsh Nagar', 'Ajmer Road', 'Amer', 'Badi Chaupar', 'Bais Godam', 'Bani Park', 'Bapu Bazar', 'Bapu Nagar', 'Brahmpuri', 'C-Scheme', 'Chandpole', 'Civil Lines', 'Durgapura', 'Gopalpura', 'Jagatpura', 'Jawahar Nagar', 'Jhotwara', 'Johri Bazar', 'Lal Kothi', 'Malviya Nagar', 'Mansarovar', 'MI Road', 'Murlipura', 'Nirman Nagar', 'Pink City', 'Pratap Nagar', 'Raja Park', 'Shastri Nagar', 'Shyam Nagar', 'Sanganer', 'Sethi Colony', 'Sindhi Camp', 'Sirsi Road', 'Sodala', 'Subhash Nagar', 'Tilak Nagar', 'Tonk Road', 'Transport Nagar', 'Tripolia Bazar', 'Vaishali Nagar', 'Vidhyadhar Nagar'],
  'Surat': ['Adajan', 'Amroli', 'Athwa Lines', 'Bamroli', 'Begumpura', 'Bhagal', 'Bhatar', 'Bhestan', 'Chowk Bazar', 'City Light', 'Dindoli', 'Dumas Road', 'Ghod Dod Road', 'Godadara', 'Gopipura', 'Jahangirpura', 'Kadodara', 'Kamrej', 'Katargam', 'Khatodara', 'Limbayat', 'Magdalla', 'Mahidharpura', 'Majura Gate', 'Nanpura', 'Olpad', 'Pal', 'Pal Gam', 'Pandesara', 'Parle Point', 'Piplod', 'Punagam', 'Rander', 'Ring Road', 'Rustampura', 'Sachin', 'Salabatpura', 'Sarthana', 'Udhna', 'Utran', 'Varachha', 'Ved Road', 'Vesu', 'Vip Road'],
  'Lucknow': ['Alambagh', 'Aliganj', 'Amausi', 'Aminabad', 'Ashiyana', 'Butler Colony', 'Cantonment', 'Charbagh', 'Chowk', 'Dalibagh', 'Faizabad Road', 'Gomti Nagar', 'Gomti Nagar Extension', 'Hazratganj', 'Hussainganj', 'Indira Nagar', 'Jankipuram', 'Jopling Road', 'Kaiserbagh', 'Kapoorthala', 'Krishna Nagar', 'Lalbagh', 'Mahanagar', 'Munshipulia', 'Nakhas', 'Narhi', 'Nirala Nagar', 'Nishatganj', 'Rajajipuram', 'Sapru Marg', 'Sarojini Nagar', 'Shringar Nagar', 'Singar Nagar', 'Sitapur Road', 'Telibagh', 'Thakurganj', 'Triveni Nagar', 'Vikas Nagar', 'Vrindavan Yojana', 'Yahiyaganj'],
  'Kochi': ['Aluva', 'Angamaly', 'Banerjee Road', 'Broadway', 'Bolgatty', 'Chilavannoor', 'Chittoor', 'Edakochi', 'Edappally', 'Elamakkara', 'Elamkulam', 'Ernakulam North', 'Ernakulam South', 'Fort Kochi', 'Giri Nagar', 'High Court Junction', 'Island', 'Kadavanthra', 'Kakkanad', 'Kalamassery', 'Kaloor', 'Marine Drive', 'Mattancherry', 'Maradu', 'Menaka', 'MG Road', 'Mundamveli', 'Nedumbassery', 'Pachalam', 'Palarivattom', 'Palluruthy', 'Panampilly Nagar', 'Paravur', 'Ravipuram', 'Shanmugham Road', 'Thevara', 'Thoppumpady', 'Thripunithura', 'Vaduthala', 'Vypeen', 'Vyttila', 'Willington Island']
};

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];
const TIME_SLOTS_24H = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const TIME_SLOTS = TIME_SLOTS_24H.map(time => ({ value: time, label: formatTime12Hour(time) }));

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

  const { data: user = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error loading user in Discover:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['availabilities', filters, selectedDate],
    queryFn: async () => {
      const query = { status: 'available' };
      if (filters.city) query.city = filters.city;
      if (filters.gender) query.gender = filters.gender;
      if (selectedDate) query.date = format(selectedDate, 'yyyy-MM-dd');
      
      let results = await base44.entities.Availability.filter(query, '-created_date', 50);
      
      // Filter by area if specified, including "Any Area" companions
      if (filters.area) {
        results = results.filter(a => a.area === filters.area || a.area === 'Any Area');
      }
      
      return results;
    },
    staleTime: 30000
  });

  const { data: companionUsers = [] } = useQuery({
    queryKey: ['companion-users'],
    queryFn: async () => {
      return await base44.entities.User.filter({ user_role: 'companion' });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  // Check if availability is in the past
  const isAvailabilityPast = (availability) => {
    if (!availability?.date || !availability?.end_time) return true;

    const now = new Date();
    const availDate = new Date(availability.date);
    
    // If date is in the past, it's expired
    if (availDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return true;
    }
    
    // If date is today, check if the end_time has passed
    if (availDate.toDateString() === now.toDateString()) {
      const [endHour, endMinute] = availability.end_time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      return endHour < currentHour || (endHour === currentHour && endMinute <= currentMinute);
    }
    
    return false;
  };

  const filteredAvailabilities = availabilities.filter(a => {
    // Don't show user's own availabilities
    if (user && a.companion_id === user.id) return false;
    
    // Filter out past availabilities
    if (isAvailabilityPast(a)) return false;
    
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
    if (selectedTime) {
      if (a.start_time > selectedTime || a.end_time <= selectedTime) return false;
    }
    if (filters.priceMin && a.price_per_hour < Number(filters.priceMin)) return false;
    if (filters.priceMax && a.price_per_hour > Number(filters.priceMax)) return false;
    if (filters.language && !a.languages?.includes(filters.language)) return false;
    if (filters.minRating) {
      const companionUser = companionUsers.find(u => u.id === a.companion_id);
      if (!companionUser || companionUser.average_rating == null || companionUser.average_rating < Number(filters.minRating)) return false;
    }
    return true;
  });

  // Group availabilities by companion
  const groupedCompanions = React.useMemo(() => {
    const grouped = {};
    filteredAvailabilities.forEach(avail => {
      if (!grouped[avail.companion_id]) {
        grouped[avail.companion_id] = [];
      }
      grouped[avail.companion_id].push(avail);
    });
    // Sort each companion's slots by date and time
    Object.keys(grouped).forEach(companionId => {
      grouped[companionId].sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
    });
    return grouped;
  }, [filteredAvailabilities]);

  const companionsList = Object.values(groupedCompanions || {});

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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Discover</h1>
            {user && <NotificationBell user={user} />}
          </div>
          
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
              <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
                <SheetHeader className="flex-shrink-0 mb-4">
                  <SheetTitle className="text-xl">Filters</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-1">
                  <div className="space-y-6 pb-6">
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

                  {/* Time Slot */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Time Slot</label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Any time</SelectItem>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
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
                    <Select 
                      value={filters.area} 
                      onValueChange={(v) => setFilters({ ...filters, area: v })}
                      disabled={!filters.city}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder={filters.city ? "Select area" : "Select city first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value={null}>All areas</SelectItem>
                        {filters.city && AREAS_BY_CITY[filters.city]?.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!filters.city && (
                      <p className="text-xs text-slate-500 mt-1">Please select a city first</p>
                    )}
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
                        placeholder="Min"
                        value={filters.priceMin}
                        onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.priceMax}
                        onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Language Spoken</label>
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
                        <SelectItem value="4.5">4.5+ stars ⭐</SelectItem>
                        <SelectItem value="4.0">4.0+ stars ⭐</SelectItem>
                        <SelectItem value="3.5">3.5+ stars ⭐</SelectItem>
                        <SelectItem value="3.0">3.0+ stars ⭐</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex-shrink-0 p-4 bg-white border-t border-slate-100 flex gap-3">
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
                  {formatTime12Hour(selectedTime)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTime('')} />
                </Badge>
              )}
              {filters.city && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.city}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, city: '' })} />
                </Badge>
              )}
              {filters.gender && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  {filters.gender}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, gender: '' })} />
                </Badge>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-violet-100 text-violet-700 whitespace-nowrap">
                  ₹{filters.priceMin || '0'}-{filters.priceMax || '∞'}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, priceMin: '', priceMax: '' })} />
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
        ) : companionsList.length === 0 ? (
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
              {companionsList.length} companion{companionsList.length !== 1 ? 's' : ''} available
            </p>
            {companionsList.map((slots, idx) => (
              <motion.div
                key={slots[0].companion_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <CompanionCard availability={slots[0]} availabilities={slots} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}