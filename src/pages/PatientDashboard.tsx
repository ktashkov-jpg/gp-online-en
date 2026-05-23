import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, getDocs, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Appointment, Doctor, Patient } from '../types';
import { Calendar, Clock, ChevronRight, CheckCircle2, History, AlertCircle, Search, UserPlus, Stethoscope } from 'lucide-react';
import { format, addDays, isToday, startOfToday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { generateTimeSlots } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getDemoAppointments, 
  saveDemoAppointments, 
  getDemoDoctors, 
  getDemoPatients, 
  saveDemoPatients, 
  DEMO_REGISTRY,
  DEMO_DOCTOR
} from '../lib/demoStore';

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingReason, setBookingReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Registry Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [registryResults, setRegistryResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isDemo = auth.currentUser?.uid?.startsWith('demo_') || !auth.currentUser;

  useEffect(() => {
    if (isDemo) {
      // 1. Load simulated Patient Profile
      const demoPatients = getDemoPatients();
      const pData = demoPatients.find(p => p.uid === 'demo_patient_id') || demoPatients[0];
      setPatient(pData);

      // 2. Load Doctors
      const demoDocs = getDemoDoctors();
      setDoctors(demoDocs);

      // 3. Load Appointments
      setAppointments(getDemoAppointments().filter(a => a.patientId === 'demo_patient_id'));

      // 4. Set up storage updates trigger
      const handleDemoUpdate = () => {
        const updatedPatients = getDemoPatients();
        const updatedP = updatedPatients.find(p => p.uid === 'demo_patient_id') || updatedPatients[0];
        setPatient(updatedP);
        
        const updatedDocs = getDemoDoctors();
        setDoctors(updatedDocs);
        
        setAppointments(getDemoAppointments().filter(a => a.patientId === 'demo_patient_id'));
      };
      
      window.addEventListener('demo_db_update', handleDemoUpdate);
      return () => window.removeEventListener('demo_db_update', handleDemoUpdate);
    }

    if (!auth.currentUser) return;

    // Fetch patient info from Firestore
    getDoc(doc(db, 'patients', auth.currentUser.uid)).then((snap) => {
      if (snap.exists()) {
        const pData = snap.data() as Patient;
        setPatient(pData);
      }
    });

    // Fetch available doctors in our system
    getDocs(collection(db, 'doctors')).then((snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), uid: d.id } as Doctor));
      setDoctors(docs);
    });

    // Listen to real appointments
    const q = query(
      collection(db, 'appointments'),
      where('patientId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const apps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(apps.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
    }, (err) => {
      import('../lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.LIST, 'appointments');
      });
    });

    return () => unsubscribe();
  }, [isDemo]);

  useEffect(() => {
    if (patient?.assignedDoctorId) {
      const docMatch = doctors.find(d => d.uid === patient.assignedDoctorId);
      if (docMatch) setSelectedDoctor(docMatch);
    } else {
      setSelectedDoctor(null);
    }
  }, [patient, doctors]);

  const searchRegistry = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    
    if (isDemo) {
      // Simulate NHS/Registry search offline instantly
      setTimeout(() => {
        const filtered = DEMO_REGISTRY.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.identityNumber.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setRegistryResults(filtered);
        setIsSearching(false);
      }, 400);
      return;
    }

    try {
      const registryRes = await fetch(`/api/doctors/registry?q=${encodeURIComponent(searchQuery)}`);
      const data = await registryRes.json();
      setRegistryResults(data);
    } catch (err) {
      console.error("Registry lookup failed in production", err);
    } finally {
      setIsSearching(false);
    }
  };

  const assignDoctor = async (docId: string) => {
    if (isDemo) {
      const pats = getDemoPatients();
      const updated = pats.map(p => p.uid === 'demo_patient_id' ? { ...p, assignedDoctorId: docId } : p);
      saveDemoPatients(updated);
      return;
    }

    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'patients', auth.currentUser.uid), {
        assignedDoctorId: docId
      });
      setPatient(prev => prev ? { ...prev, assignedDoctorId: docId } : null);
    } catch (err) {
      console.error("Critical: Failed to assign preferred GP clinician", err);
    }
  };

  const handleBook = async () => {
    if (!selectedDoctor || !selectedTime || !selectedDate) return;

    setIsBooking(true);
    
    const start = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    if (isDemo) {
      const newApp: Appointment = {
        id: `demo_app_${Date.now()}`,
        patientId: 'demo_patient_id',
        doctorId: selectedDoctor.uid,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: 'pending',
        reason: bookingReason,
        createdAt: new Date().toISOString()
      };

      const originalApps = getDemoAppointments();
      saveDemoAppointments([newApp, ...originalApps]);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setSelectedTime(null);
      setBookingReason('');
      setIsBooking(false);
      return;
    }

    if (!auth.currentUser) return;
    const path = 'appointments';
    try {
      await addDoc(collection(db, path), {
        patientId: auth.currentUser.uid,
        doctorId: selectedDoctor.uid,
        startTime: start,
        endTime: end,
        status: 'pending',
        reason: bookingReason,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setSelectedTime(null);
      setBookingReason('');
    } catch (err) {
      import('../lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.CREATE, path);
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (!patient?.assignedDoctorId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <div className="bg-blue-150 bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <UserPlus className="text-blue-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Register Your Primary GP Clinic</h1>
          <p className="text-gray-500 font-medium leading-relaxed">Search registries or assign a licensed healthcare provider to unlock instant real-time appointment bookings.</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchRegistry()}
                  placeholder="Type doctor's name, specialty, practice, or ID..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm border border-gray-100 placeholder:text-gray-400"
                />
              </div>
              <button 
                onClick={searchRegistry}
                disabled={isSearching}
                className="bg-gray-950 text-white px-8 py-4 sm:py-0 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 text-sm shadow-sm"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
           </div>

           <div className="space-y-4">
              {registryResults.length === 0 && !isSearching ? (
                 <div className="text-center py-12 text-gray-400 text-sm italic border-2 border-dashed border-gray-50 rounded-2xl">
                    Type GP's catalog tags above (e.g. "Sarah", "Arthur" or "Chen") to start clinic sign-on.
                 </div>
              ) : (
                registryResults.map((docItem) => {
                  const isRegistered = doctors.some(d => d.name.toLowerCase() === docItem.name.toLowerCase());
                  const registeredDoc = doctors.find(d => d.name.toLowerCase() === docItem.name.toLowerCase());
                  
                  return (
                    <div key={docItem.identityNumber || docItem.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 shrink-0">
                           <Stethoscope className="text-blue-500 w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">{docItem.name}</div>
                          <div className="text-xs text-gray-400 mt-1 leading-normal">{docItem.practiceAddress || "General Practice"}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-black text-gray-400 select-none uppercase">{docItem.identityNumber}</span>
                            <span>•</span>
                            {isRegistered ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Available Online</span>
                            ) : (
                              <span className="text-[9px] bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Unregistered</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => isRegistered && registeredDoc && assignDoctor(registeredDoc.uid)}
                        disabled={!isRegistered}
                        className={`px-6 py-3 rounded-xl font-bold text-xs transition-all tracking-wider ${
                          isRegistered ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Register
                      </button>
                    </div>
                  );
                })
              )}
           </div>
        </div>
      </div>
    );
  }

  const timeSlots = selectedDoctor ? generateTimeSlots(selectedDoctor.workingHours.start, selectedDoctor.workingHours.end) : [];
  
  // Filter out slots that are in the past today
  const availableSlots = timeSlots.filter(slot => {
    if (!isToday(selectedDate)) return true;
    try {
      const [h, m] = slot.split(':').map(Number);
      const slotTime = new Date(selectedDate);
      slotTime.setHours(h, m, 0, 0);
      return slotTime > new Date();
    } catch {
      return true;
    }
  });

  // Filter out already booked slots
  const filteredSlots = availableSlots.filter(slot => {
    try {
      return !appointments.some(app => {
        const appDate = new Date(app.startTime);
        return app.doctorId === selectedDoctor?.uid && 
               format(appDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
               format(appDate, 'HH:mm') === slot &&
               app.status !== 'cancelled';
      });
    } catch {
      return true;
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-12 px-4">
      {/* Current GP Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
               <Stethoscope className="text-blue-600 w-8 h-8" />
            </div>
            <div>
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Assigned Clinician</div>
               <div className="text-xl font-black text-gray-900 mt-0.5">{selectedDoctor?.name || 'Loading Primary GP...'}</div>
            </div>
         </div>
         <button 
           onClick={() => assignDoctor('')} 
           className="text-xs font-bold text-red-500 hover:bg-red-50 border border-red-100/50 hover:border-red-200 px-4 py-2.5 rounded-xl transition-all"
         >
           Deregister / Edit GP
         </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Left: Booking Form */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Book Consultation</h1>
            <p className="text-gray-500 font-medium">Select a suitable medical appointment day and time block.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-8">
            {/* Step 1: Date */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">1. Select Booking Day</label>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {[0, 1, 2, 3, 4, 5, 6].map(i => {
                  const date = addDays(new Date(), i);
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      className={`flex-shrink-0 w-20 py-4 rounded-2xl flex flex-col items-center transition-all ${
                        isSelected ? 'bg-blue-600 text-white shadow-lg scale-105 border-0' : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-100/50'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase opacity-75">{format(date, 'EEE', { locale: enUS })}</span>
                      <span className="text-2xl font-black mt-1 leading-none">{format(date, 'dd')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Time */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">2. Choose Session Slot</label>
              {filteredSlots.length === 0 ? (
                <div className="bg-orange-50 p-4 border border-orange-100 rounded-xl text-orange-700 text-xs flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 shrink-0" />
                   No convenient consultation shifts available on this day. Please select another date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-3 rounded-xl font-bold text-xs transition-all text-center border ${
                        selectedTime === slot ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Reason */}
            <div className={`transition-all duration-300 ${selectedTime ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
               <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">3. Consultation Reason & Notes</label>
               <input 
                 value={bookingReason}
                 onChange={(e) => setBookingReason(e.target.value)}
                 className="w-full p-4 bg-gray-50 border border-gray-150 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-gray-900 text-sm"
                 placeholder="e.g. Flu symptoms walkthrough, standard medical check, script renewal..."
               />
               <button
                 disabled={!selectedTime || !bookingReason || isBooking}
                 onClick={handleBook}
                 className="w-full mt-8 bg-gray-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-gray-850 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {isBooking ? 'Registering Booking...' : 'Request Slot confirmation'}
                 {!isBooking && <ChevronRight className="w-5 h-5" />}
               </button>
            </div>
          </div>
        </div>

        {/* Right: History */}
        <div className="space-y-8">
           <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900">Your Appointment Logger</h2>
              <History className="text-gray-300 w-8 h-8" />
           </div>

           <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-100 rounded-[2rem] bg-white">
                   You have no upcoming or historical consultation slots registered.
                </div>
              ) : (
                appointments.map((app) => {
                  const doctorObj = doctors.find(d => d.uid === app.doctorId) || DEMO_DOCTOR;
                  return (
                    <motion.div 
                      layout
                      key={app.id} 
                      className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6"
                    >
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex flex-col items-center justify-center text-blue-600 border border-blue-100 shrink-0">
                         <span className="text-[9px] font-black uppercase tracking-wider">{format(new Date(app.startTime), 'MMM', { locale: enUS })}</span>
                         <span className="text-2xl font-black leading-none mt-0.5">{format(new Date(app.startTime), 'dd')}</span>
                      </div>
                      <div className="flex-grow min-w-0">
                         <div className="flex items-center gap-2 text-gray-400 mb-1 leading-none">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-wider">{format(new Date(app.startTime), 'HH:mm')} - {format(new Date(app.endTime), 'HH:mm')}</span>
                         </div>
                         <h4 className="font-bold text-gray-900 truncate leading-tight">{app.reason || 'General Health Review'}</h4>
                         <div className="text-xs text-gray-400 mt-1">Dr. {doctorObj?.name || 'Primary GP'}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shrink-0 tracking-wider ${
                        app.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 
                        app.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {app.status}
                      </div>
                    </motion.div>
                  );
                })
              )}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-950 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50"
          >
            <CheckCircle2 className="text-emerald-400 w-6 h-6 shrink-0" />
            <span className="font-bold text-sm">Consultation appointment requested successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
