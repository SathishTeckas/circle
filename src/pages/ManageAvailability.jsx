import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatTime12Hour } from '../components/utils/timeFormat';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Calendar as CalendarIcon, Clock, MapPin, DollarSign, 
  Trash2, Edit, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CITY_AREAS = {
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
// Generate time slots with 15-minute intervals (9 AM to 10 PM)
const generateTimeSlots = (includeEndTime = false) => {
  const slots = [];
  const endHour = includeEndTime ? 22 : 21; // 10 PM for end time, 9 PM for start time
  for (let hour = 9; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour && minute > 0) break; // Only include XX:00 for last hour
      const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push({ value: time24, label: formatTime12Hour(time24) });
    }
  }
  return slots;
};

// Helper to check if two time ranges overlap
const doTimesOverlap = (start1, end1, start2, end2) => {
  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const s1 = toMinutes(start1), e1 = toMinutes(end1);
  const s2 = toMinutes(start2), e2 = toMinutes(end2);
  return s1 < e2 && s2 < e1;
};

const TIME_SLOTS = generateTimeSlots(false);
const END_TIME_SLOTS = generateTimeSlots(true);

export default function ManageAvailability() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    area: '',
    city: '',
    price_per_hour: ''
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['active-cities'],
    queryFn: async () => {
      const allCities = await base44.entities.City.filter({ is_active: true });
      return allCities.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    staleTime: 5 * 60 * 1000
  });

  const availableAreas = formData.city ? (() => {
    const cityData = cities.find(c => c.name === formData.city);
    return cityData?.areas || [];
  })() : [];

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Check if KYC is required
      if (userData.kyc_status !== 'verified') {
        window.location.href = createPageUrl('KYCVerification');
      }
    };
    loadUser();
  }, []);

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['my-availabilities', user?.id],
    queryFn: async () => {
      return await base44.entities.Availability.filter({ companion_id: user.id }, '-date', 50);
    },
    enabled: !!user?.id
  });

  const sheetContentRef = React.useRef(null);

  useEffect(() => {
    if (showForm && sheetContentRef.current) {
      // Immediate scroll to ensure it starts at top
      sheetContentRef.current.scrollTop = 0;
      // Also do a smooth scroll as backup
      setTimeout(() => {
        sheetContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
    }
  }, [showForm]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate not booking past times
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      const [startHour, startMin] = formData.start_time.split(':').map(Number);
      selectedDateTime.setHours(startHour, startMin, 0, 0);
      
      if (selectedDateTime <= now) {
        throw new Error('Cannot create availability for past times');
      }

      // Calculate duration in hours (with decimal for minutes)
      const [endHour, endMin] = formData.end_time.split(':').map(Number);
      const duration = (endHour + endMin / 60) - (startHour + startMin / 60);

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Check for overlapping time slots on the same date
      const existingAvailabilities = await base44.entities.Availability.filter({ 
        companion_id: user.id,
        date: dateStr,
        status: 'available'
      });

      const overlappingSlot = existingAvailabilities.find(slot => {
        // Skip the slot being edited
        if (editingSlot && slot.id === editingSlot.id) return false;
        return doTimesOverlap(formData.start_time, formData.end_time, slot.start_time, slot.end_time);
      });

      if (overlappingSlot) {
        throw new Error(`This time overlaps with your existing slot (${formatTime12Hour(overlappingSlot.start_time)} - ${formatTime12Hour(overlappingSlot.end_time)})`);
      }

      const availabilityData = {
        companion_id: user.id,
        companion_name: user.display_name || user.full_name,
        companion_photo: user.profile_photos?.[0],
        date: dateStr,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_hours: duration,
        area: formData.area,
        city: formData.city,
        price_per_hour: parseFloat(formData.price_per_hour),
        total_price: parseFloat(formData.price_per_hour) * duration,
        status: 'available',
        languages: user.languages || ['English'],
        interests: user.interests || [],
        gender: user.gender
      };

      if (editingSlot) {
        await base44.entities.Availability.update(editingSlot.id, availabilityData);
      } else {
        const newAvailability = await base44.entities.Availability.create(availabilityData);
        // Optimistically add to cache
        queryClient.setQueryData(['my-availabilities', user.id], (old = []) => [newAvailability, ...old]);
        queryClient.setQueryData(['active-availabilities', user.id], (old = []) => [newAvailability, ...old]);
      }
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingSlot(null);
      setFormData({ start_time: '', end_time: '', area: '', city: '', price_per_hour: '' });
      setSelectedDate(null);
      toast.success(editingSlot ? 'Availability updated!' : 'Availability added!');
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
      queryClient.invalidateQueries({ queryKey: ['active-availabilities'] });
      toast.error(error.message || `Failed to ${editingSlot ? 'update' : 'create'} availability`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Availability.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
    }
  });

  // Check if availability is in the past or has less than 1 hour remaining
  const isAvailabilityPast = (availability) => {
    const now = new Date();
    const availDate = new Date(availability.date);
    
    // If date is in the past, it's expired
    if (availDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return true;
    }
    
    // If date is today, check if there's at least 1 hour remaining
    if (availDate.toDateString() === now.toDateString()) {
      const [endHour, endMinute] = availability.end_time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Calculate minutes remaining until end time
      const endTimeMinutes = endHour * 60 + endMinute;
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const minutesRemaining = endTimeMinutes - currentTimeMinutes;
      
      // Mark as past if less than 60 minutes remaining
      return minutesRemaining < 60;
    }
    
    return false;
  };

  const activeAvailabilities = availabilities.filter(a => a.status === 'available' && !isAvailabilityPast(a));
  const bookedAvailabilities = availabilities.filter(a => a.status === 'booked');

  const canSubmit = selectedDate && formData.start_time && formData.end_time && 
                    formData.area && formData.city && formData.price_per_hour;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F9FA', fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#DFE6E9' }}>
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#FFF3B8' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#2D3436' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold" style={{ color: '#2D3436' }}>My Availability</h1>
            <p className="text-sm" style={{ color: '#636E72' }}>{activeAvailabilities.length} active slots</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Add New Button */}
        <Sheet open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingSlot(null);
            setFormData({ start_time: '', end_time: '', area: '', city: '', price_per_hour: '' });
            setSelectedDate(null);
          }
        }}>
          <SheetTrigger asChild>
            <Button className="w-full h-14 rounded-xl text-lg font-bold" style={{ background: '#FFD93D', color: '#2D3436' }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Availability
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
            <SheetHeader className="mb-6 flex-shrink-0">
              <SheetTitle>{editingSlot ? 'Edit Availability' : 'Create Availability'}</SheetTitle>
            </SheetHeader>

            <div ref={sheetContentRef} className="space-y-6 overflow-y-auto flex-1 pb-24 pr-2">
              {/* Date Selection */}
              <div>
                <Label className="mb-2 block">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className="rounded-xl border mx-auto"
                  classNames={{
                    day_selected: "bg-violet-600 text-white hover:bg-violet-700 hover:text-white focus:bg-violet-700 focus:text-white"
                  }}
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Start Time</Label>
                  <Select 
                    value={formData.start_time} 
                    onValueChange={(v) => setFormData({ ...formData, start_time: v, end_time: '' })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {TIME_SLOTS.filter(time => {
                        // If no date selected, show all times
                        if (!selectedDate) return true;
                        
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const selectedDateOnly = new Date(selectedDate);
                        selectedDateOnly.setHours(0, 0, 0, 0);
                        
                        // If selected date is in the future, show all times
                        if (selectedDateOnly > today) return true;
                        
                        // If selected date is today, filter out past times
                        if (selectedDateOnly.getTime() === today.getTime()) {
                          const now = new Date();
                          const [slotHour, slotMin] = time.value.split(':').map(Number);
                          const slotTime = new Date();
                          slotTime.setHours(slotHour, slotMin, 0, 0);
                          return slotTime > now;
                        }
                        
                        return true;
                      }).map(time => (
                        <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">End Time (Min. 1hr)</Label>
                  <Select 
                    value={formData.end_time} 
                    onValueChange={(v) => setFormData({ ...formData, end_time: v })}
                    disabled={!formData.start_time}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder={formData.start_time ? "Select" : "Start first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {END_TIME_SLOTS.filter(t => {
                        if (!formData.start_time) return false;
                        const [startHour, startMin] = formData.start_time.split(':').map(Number);
                        const [endHour, endMin] = t.value.split(':').map(Number);
                        const startTotalMin = startHour * 60 + startMin;
                        const endTotalMin = endHour * 60 + endMin;
                        return endTotalMin >= startTotalMin + 60; // At least 1 hour gap
                      }).map(time => (
                        <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Duration Display */}
              {formData.start_time && formData.end_time && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                  <p className="text-sm text-slate-600">
                    Duration: <span className="font-semibold text-violet-700">
                      {(() => {
                        const [startHour, startMin] = formData.start_time.split(':').map(Number);
                        const [endHour, endMin] = formData.end_time.split(':').map(Number);
                        const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        return hours > 0 && minutes > 0 
                          ? `${hours}h ${minutes}m` 
                          : hours > 0 
                            ? `${hours} hour${hours > 1 ? 's' : ''}` 
                            : `${minutes} minutes`;
                      })()}
                    </span>
                  </p>
                </div>
              )}

              {/* Location */}
              <div>
                <Label className="mb-2 block">City</Label>
                <Select 
                  value={formData.city} 
                  onValueChange={(v) => setFormData({ ...formData, city: v, area: '' })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Preferred Area</Label>
                <Select 
                  value={formData.area} 
                  onValueChange={(v) => setFormData({ ...formData, area: v })}
                  disabled={!formData.city}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder={formData.city ? "Select area" : "Select city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any Area">Any Area (Available across {formData.city})</SelectItem>
                    {availableAreas.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div>
                <Label className="mb-2 block">Price per Hour (₹)</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={formData.price_per_hour}
                  onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex-shrink-0 p-4 bg-white border-t border-slate-100">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="w-full h-14 bg-violet-600 hover:bg-violet-700 rounded-xl text-lg"
              >
{createMutation.isPending ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  editingSlot ? 'Update Availability' : 'Save Availability'
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Active Slots */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Active Slots</h3>
          {activeAvailabilities.length === 0 ? (
            <Card className="p-6 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No active availability slots</p>
              <p className="text-sm text-slate-500">Add slots to start receiving bookings</p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {activeAvailabilities.map((slot) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-violet-600" />
                            <span className="font-medium text-slate-900">
                              {format(new Date(slot.date), 'EEE, MMM d')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4" />
                            {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4" />
                            {slot.area}, {slot.city}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">₹{slot.price_per_hour}/hr</p>
                          <div className="flex gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingSlot(slot);
                                setSelectedDate(new Date(slot.date));
                                setFormData({
                                  start_time: slot.start_time,
                                  end_time: slot.end_time,
                                  area: slot.area,
                                  city: slot.city,
                                  price_per_hour: slot.price_per_hour.toString()
                                });
                                setShowForm(true);
                              }}
                              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                            >
                              <Edit className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(slot.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Booked Slots */}
        {bookedAvailabilities.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Booked Slots</h3>
            <div className="space-y-3">
              {bookedAvailabilities.map((slot) => (
                <Card key={slot.id} className="p-4 bg-violet-50 border-violet-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-violet-600" />
                        <span className="font-medium text-slate-900">
                          {format(new Date(slot.date), 'EEE, MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                      </div>
                    </div>
                    <Badge className="bg-violet-200 text-violet-800">
                      {slot.status === 'pending' ? 'Pending' : 'Booked'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}