import { useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Appointment, Doctor } from '../types';
import { Calendar, Users, Bell, RefreshCcw, Check, X, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { getDemoAppointments, saveDemoAppointments, DEMO_DOCTOR } from '../lib/demoStore';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemo = auth.currentUser?.uid?.startsWith('demo_') || !auth.currentUser;

  useEffect(() => {
    if (isDemo) {
      setDoctor(DEMO_DOCTOR);
      setAppointments(getDemoAppointments());
      setLoading(false);

      // Reactive update if changes occur (e.g. from the Patient dashboard in another click / action)
      const handleDemoUpdate = () => {
        setAppointments(getDemoAppointments());
      };
      window.addEventListener('demo_db_update', handleDemoUpdate);
      return () => window.removeEventListener('demo_db_update', handleDemoUpdate);
    }

    if (!auth.currentUser) return;

    // Fetch doctor info from Firestore
    getDoc(doc(db, 'doctors', auth.currentUser.uid)).then((snap) => {
      if (snap.exists()) setDoctor(snap.data() as Doctor);
    });

    // Listen to real appointments from Firestore
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const apps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(apps.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      setLoading(false);
    }, (err) => {
      import('../lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.LIST, 'appointments');
      });
    });

    return () => unsubscribe();
  }, [isDemo]);

  const updateStatus = async (appId: string, status: string) => {
    if (isDemo) {
      const current = getDemoAppointments();
      const updated = current.map(app => 
        app.id === appId ? { ...app, status: status as 'confirmed' | 'cancelled' | 'pending' } : app
      );
      saveDemoAppointments(updated);
      return;
    }

    await updateDoc(doc(db, 'appointments', appId), { status });
  };

  const syncCalendar = async () => {
    if (isDemo) {
      // Simulate OAuth successfully syncing to state
      if (doctor) {
        const updatedDoc = { ...doctor, calendarSync: { googleEnabled: true } };
        setDoctor(updatedDoc);
        alert("Google Calendar authentication succeeded! Doctor availability is now synchronized. Let's start the demo.");
      }
      return;
    }

    if (!auth.currentUser) return;
    try {
      const res = await fetch(`/api/auth/google/url?userId=${auth.currentUser.uid}`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to fetch Google Calendar OAuth URI", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const today = new Date();
  const todayApps = appointments.filter(a => {
    try {
      return isSameDay(new Date(a.startTime), today);
    } catch {
      return false;
    }
  });
  
  // Weekly Breakdown Logic
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Calendar className="text-blue-600" />}
          label="Today's Consultations"
          value={todayApps.length.toString()}
          bgColor="bg-blue-50"
        />
        <StatCard 
          icon={<Users className="text-green-600" />}
          label="Total Registered Patients"
          value="1,420"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          icon={<Bell className="text-orange-600" />}
          label="SMS/Viber Reminders"
          value="Active & Online"
          bgColor="bg-orange-50"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Appointments List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
                <p className="text-xs text-gray-500 mt-1">Review, confirm, or filter patient walkthroughs</p>
              </div>
              <button 
                onClick={syncCalendar}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-100 shadow-sm"
              >
                <RefreshCcw className="w-4 h-4" />
                {doctor?.calendarSync?.googleEnabled ? "Google Calendar Synced" : "Sync Google Calendar"}
              </button>
            </div>

            <div className="space-y-4">
              {todayApps.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm italic">
                  No medical consultations scheduled for today.
                </div>
              ) : (
                todayApps.map(app => (
                  <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100/80 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-gray-700 min-w-[55px]">
                        {format(new Date(app.startTime), 'HH:mm')}
                      </div>
                      <div className="h-8 w-[1px] bg-gray-200"></div>
                      <div>
                        <div className="font-semibold text-gray-950">
                          {app.patientId === 'demo_patient_id' ? 'John Doe (Demo Patient)' : `Patient #${app.patientId.substring(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 mt-0.5">{app.reason}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       {app.status === 'pending' && (
                         <div className="flex gap-2">
                           <button 
                             onClick={() => updateStatus(app.id, 'confirmed')} 
                             className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                             title="Confirm appointment"
                           >
                             <Check className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => updateStatus(app.id, 'cancelled')} 
                             className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                             title="Cancel appointment"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                         app.status === 'confirmed' ? 'bg-emerald-150 text-emerald-700 bg-emerald-50' : 
                         app.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                       }`}>
                         {app.status}
                       </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
               <CalendarDays className="w-6 h-6 text-blue-600" />
               Weekly Agenda Forecast
            </h2>
            <div className="space-y-4">
              {days.map(day => {
                const dayApps = appointments.filter(a => isSameDay(new Date(a.startTime), day));
                return (
                  <div key={day.toString()} className="flex items-start gap-6 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="w-20 text-right shrink-0">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{format(day, 'EEE', { locale: enUS })}</div>
                      <div className="text-2xl font-black text-gray-900">{format(day, 'dd')}</div>
                    </div>
                    <div className="flex-grow">
                       {dayApps.length === 0 ? (
                         <div className="text-xs text-gray-300 italic py-2">Rest Day / No appointments</div>
                       ) : (
                         <div className="flex flex-wrap gap-2 pt-1">
                           {dayApps.map(a => (
                             <span key={a.id} className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                {format(new Date(a.startTime), 'HH:mm')}
                             </span>
                           ))}
                         </div>
                       )}
                    </div>
                    <div className="text-xs font-bold text-gray-400">
                       {dayApps.length} {dayApps.length === 1 ? 'visit' : 'visits'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Settings/Profile */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-xs font-medium uppercase tracking-wider opacity-80">Automated Digests</h3>
                <p className="text-2xl font-bold mt-2 leading-tight">
                  Every Sunday evening you get your customized weekly planner.
                </p>
                <div className="mt-8 flex gap-2">
                   <div className="bg-white/20 p-3 rounded-xl hover:bg-white/30 transition-colors">
                      <Bell className="w-6 h-6" />
                   </div>
                </div>
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h4 className="font-bold text-gray-900 mb-4">Practice Config</h4>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500">Working Period</span>
                   <span className="font-semibold text-gray-900">{doctor?.workingHours?.start || '09:00'} - {doctor?.workingHours?.end || '17:00'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500">Google Calendar</span>
                   <span className={`font-semibold ${doctor?.calendarSync?.googleEnabled ? 'text-emerald-600' : 'text-amber-500'}`}>
                     {doctor?.calendarSync?.googleEnabled ? 'Active & Synced' : 'Inactive'}
                   </span>
                </div>
                <button 
                  onClick={() => alert("Practice profile updates can be configured via Google Calendar sync panel.")}
                  className="w-full mt-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl font-bold transition-colors border border-gray-200 text-xs"
                >
                   Configure Slots & Holiday Bounds
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bgColor }: { icon: ReactNode, label: string, value: string, bgColor: string }) {
  return (
    <div className={`p-6 rounded-2xl ${bgColor} border border-white/50 flex items-center gap-6 shadow-sm`}>
      <div className="bg-white p-3 rounded-xl shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-black text-gray-900 mt-1">{value}</div>
      </div>
    </div>
  );
}
