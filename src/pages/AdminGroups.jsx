import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Users, Plus, Calendar as CalendarIcon, Clock, MapPin,
  ArrowLeft, Trash2, Edit, Image as ImageIcon, X, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const time12 = `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
      slots.push({ value: time24, label: time12 });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const CITIES = {
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
const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati', 'Bengali', 'Punjabi'];

export default function AdminGroups() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    city: '',
    area: '',
    time: '',
    languages: [],
    age_range_min: '25',
    age_range_max: '40',
    max_participants: '8',
    venue_name: '',
    venue_address: '',
    description: '',
    price: '',
    photos: []
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      if (user.user_role !== 'admin' && user.role !== 'admin') {
        window.location.href = createPageUrl('Discover');
      }
    };
    checkAdmin();
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-group-events'],
    queryFn: () => base44.entities.GroupEvent.list('-date', 50)
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['venues-for-groups'],
    queryFn: () => base44.entities.Venue.filter({ verified: true }, 'name', 50)
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        photos: [...(formData.photos || []), file_url]
      });
    } catch (error) {
      console.error('Photo upload failed:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index)
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingEvent) {
        await base44.entities.GroupEvent.update(editingEvent.id, {
          ...formData,
          date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : editingEvent.date,
          age_range_min: parseInt(formData.age_range_min),
          age_range_max: parseInt(formData.age_range_max),
          max_participants: parseInt(formData.max_participants),
          price: formData.price ? parseFloat(formData.price) : editingEvent.price,
          language: formData.languages.join(', '),
          photos: formData.photos || []
        });
      } else {
        await base44.entities.GroupEvent.create({
          ...formData,
          date: format(selectedDate, 'yyyy-MM-dd'),
          age_range_min: parseInt(formData.age_range_min),
          age_range_max: parseInt(formData.age_range_max),
          max_participants: parseInt(formData.max_participants),
          price: parseFloat(formData.price),
          language: formData.languages.join(', '),
          photos: formData.photos || [],
          current_participants: 0,
          status: 'open'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-events'] });
      setShowForm(false);
      setEditingEvent(null);
      setFormData({
        title: '', city: '', area: '', time: '', languages: [],
        age_range_min: '25', age_range_max: '40', max_participants: '8',
        venue_name: '', venue_address: '', description: '', price: '', photos: []
      });
      setSelectedDate(null);
    }
  });

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    const languages = event.language ? event.language.split(', ').map(l => l.trim()) : [];
    setFormData({
      title: event.title || '',
      city: event.city,
      area: event.area || '',
      time: event.time,
      languages: languages,
      age_range_min: event.age_range_min.toString(),
      age_range_max: event.age_range_max.toString(),
      max_participants: event.max_participants.toString(),
      venue_name: event.venue_name || '',
      venue_address: event.venue_address || '',
      description: event.description || '',
      price: event.price?.toString() || '',
      photos: event.photos || []
    });
    setSelectedDate(event.date ? new Date(event.date) : null);
    setShowForm(true);
  };

  useEffect(() => {
    if (!showForm && !editingEvent) {
      setFormData({
        title: '', city: '', area: '', time: '', languages: [],
        age_range_min: '25', age_range_max: '40', max_participants: '8',
        venue_name: '', venue_address: '', description: '', price: '', photos: []
      });
      setSelectedDate(null);
    }
  }, [showForm, editingEvent]);

  const toggleLanguage = (lang) => {
    setFormData({
      ...formData,
      languages: formData.languages.includes(lang)
        ? formData.languages.filter(l => l !== lang)
        : [...formData.languages, lang]
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (eventId) => {
      await base44.entities.GroupEvent.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-events'] });
    }
  });

  const canSubmit = selectedDate && formData.city && formData.area && formData.time && formData.languages.length > 0;

  const statusColors = {
    open: 'bg-emerald-600 text-white hover:bg-white hover:text-emerald-600 hover:border hover:border-emerald-600 transition-all cursor-pointer',
    full: 'bg-orange-600 text-white hover:bg-white hover:text-orange-600 hover:border hover:border-orange-600 transition-all cursor-pointer',
    confirmed: 'bg-blue-600 text-white hover:bg-white hover:text-blue-600 hover:border hover:border-blue-600 transition-all cursor-pointer',
    completed: 'bg-violet-600 text-white hover:bg-white hover:text-violet-600 hover:border hover:border-violet-600 transition-all cursor-pointer',
    cancelled: 'bg-slate-500 text-white hover:bg-white hover:text-slate-500 hover:border hover:border-slate-500 transition-all cursor-pointer'
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
                <h1 className="text-2xl font-bold text-slate-900">Group Events</h1>
                <p className="text-sm text-slate-600">{events.length} events created</p>
              </div>
            </div>

            <Sheet open={showForm} onOpenChange={setShowForm}>
              <SheetTrigger asChild>
                <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{editingEvent ? 'Edit Event' : 'Create Group Event'}</SheetTitle>
                </SheetHeader>

                <div className="space-y-4 mt-6 pb-6">
                  <div>
                    <Label>Event Title (Optional)</Label>
                    <Input
                      placeholder="e.g., Friday Night Social"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                          classNames={{
                            day_selected: "bg-fuchsia-600 text-white hover:bg-fuchsia-700 hover:text-white focus:bg-fuchsia-700 focus:text-white"
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Time</Label>
                    <Select value={formData.time} onValueChange={(v) => setFormData({ ...formData, time: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                         {TIME_SLOTS.map(slot => (
                           <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>City</Label>
                    <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v, area: '' })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CITIES).map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Area</Label>
                    <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })} disabled={!formData.city}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={formData.city ? "Select area" : "Select city first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.city && CITIES[formData.city].map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Languages (Select Multiple)</Label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          onClick={() => toggleLanguage(lang)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all border-2",
                            formData.languages.includes(lang)
                              ? "bg-fuchsia-600 text-white border-fuchsia-600"
                              : "bg-white text-slate-700 border-slate-200 hover:border-fuchsia-300"
                          )}
                        >
                          {formData.languages.includes(lang) && (
                            <Check className="w-3 h-3 inline mr-1" />
                          )}
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Age Min</Label>
                      <Input
                        type="number"
                        value={formData.age_range_min}
                        onChange={(e) => setFormData({ ...formData, age_range_min: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Age Max</Label>
                      <Input
                        type="number"
                        value={formData.age_range_max}
                        onChange={(e) => setFormData({ ...formData, age_range_max: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Max Participants</Label>
                    <Input
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Venue Name</Label>
                    <Input
                      placeholder="Restaurant or cafe name"
                      value={formData.venue_name}
                      onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Venue Address</Label>
                    <Input
                      placeholder="Full address"
                      value={formData.venue_address}
                      onChange={(e) => setFormData({ ...formData, venue_address: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Price Per Person (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 299"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Any additional details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Event Photos</Label>
                    <div className="mt-1">
                      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                        <div className="flex flex-col items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                          <span className="text-sm text-slate-600">Upload photos</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="hidden"
                        />
                      </label>
                      {formData.photos && formData.photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {formData.photos.map((photo, idx) => (
                            <div key={idx} className="relative group">
                              <img src={photo} alt="Event" className="w-full h-20 object-cover rounded-lg" />
                              <button
                                onClick={() => removePhoto(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!canSubmit || createMutation.isPending}
                    className="w-full h-12 bg-fuchsia-600 hover:bg-fuchsia-700 rounded-xl"
                  >
                    {createMutation.isPending ? (editingEvent ? 'Updating...' : 'Creating...') : (editingEvent ? 'Update Event' : 'Create Event')}
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
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">No events yet</h3>
            <p className="text-slate-600">Create group events for users to join</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className="p-4">
                   {event.photos && event.photos.length > 0 && (
                     <div className="mb-3 rounded-lg overflow-hidden h-40 bg-slate-100">
                       <img src={event.photos[0]} alt="Event" className="w-full h-full object-cover" />
                     </div>
                   )}
                   <div className="flex items-start justify-between mb-3">
                     <div>
                       <div className="flex items-center gap-2">
                         <h3 className="font-semibold text-slate-900 text-lg">
                           {event.title || 'Group Meetup'}
                         </h3>
                         <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                           #{event.id.slice(-5)}
                         </span>
                       </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColors[event.status]}>
                          {event.status}
                        </Badge>
                        <Badge variant="outline">{event.language}</Badge>
                        <span className="text-sm text-slate-500">
                          Ages {event.age_range_min}-{event.age_range_max}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEvent(event)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(event.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                   </div>

                   <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-fuchsia-600" />
                      {event.date ? format(new Date(event.date), 'EEEE, MMMM d, yyyy') : 'TBD'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-fuchsia-600" />
                      {event.time}
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-fuchsia-600" />
                        {event.venue_name}, {event.city}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {event.price && (
                        <span className="text-sm font-medium text-fuchsia-600">
                          ₹{event.price}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={createPageUrl('AdminGroupsDashboard') + `?eventId=${event.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Participants →
                      </a>
                      {event.status === 'completed' && (
                        <a
                          href={createPageUrl('AdminFeedbackView') + `?eventId=${event.id}`}
                          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                        >
                          View Feedback
                        </a>
                      )}
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