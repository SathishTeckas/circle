import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatTime12Hour } from '../components/utils/timeFormat';
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
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kochi'];
const TIME_SLOTS_24H = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const TIME_SLOTS = TIME_SLOTS_24H.map(time => ({ value: time, label: formatTime12Hour(time) }));

export default function ManageAvailability() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    area: '',
    city: '',
    price_per_hour: ''
  });

  const availableAreas = formData.city ? CITY_AREAS[formData.city] || [] : [];

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
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
      const startHour = parseInt(formData.start_time.split(':')[0]);
      const endHour = parseInt(formData.end_time.split(':')[0]);
      const duration = endHour - startHour;

      await base44.entities.Availability.create({
        companion_id: user.id,
        companion_name: user.display_name || user.full_name,
        companion_photo: user.profile_photos?.[0],
        date: format(selectedDate, 'yyyy-MM-dd'),
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
      setShowForm(false);
      setFormData({ start_time: '', end_time: '', area: '', city: '', price_per_hour: '' });
      setSelectedDate(null);
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

  const activeAvailabilities = availabilities.filter(a => a.status === 'available');
  const bookedAvailabilities = availabilities.filter(a => a.status === 'booked');

  const canSubmit = selectedDate && formData.start_time && formData.end_time && 
                    formData.area && formData.city && formData.price_per_hour;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">My Availability</h1>
            <p className="text-sm text-slate-600">{activeAvailabilities.length} active slots</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Add New Button */}
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetTrigger asChild>
            <Button className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Availability
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
            <SheetHeader className="mb-6 flex-shrink-0">
              <SheetTitle>Create Availability</SheetTitle>
            </SheetHeader>

            <div ref={sheetContentRef} className="space-y-6 overflow-y-auto flex-1 pb-24 pr-2">
              <style>{`
                .rdp-day_selected {
                  background-color: rgb(236 72 153) !important;
                  color: white !important;
                }
                .rdp-day_selected:hover {
                  background-color: rgb(219 39 119) !important;
                  color: white !important;
                }
              `}</style>
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
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Start Time</Label>
                  <Select 
                    value={formData.start_time} 
                    onValueChange={(v) => setFormData({ ...formData, start_time: v })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">End Time</Label>
                  <Select 
                    value={formData.end_time} 
                    onValueChange={(v) => setFormData({ ...formData, end_time: v })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.filter(t => t.value > formData.start_time).map(time => (
                        <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                    {CITIES.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
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
                  'Save Availability'
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(slot.id)}
                            className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
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