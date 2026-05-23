import { signInWithGoogle } from '../lib/firebase';
import { ShieldCheck, CalendarCheck2, Bell, Heart, Sparkles, TestTube } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const startDemo = (role: 'doctor' | 'patient') => {
    const isDoctor = role === 'doctor';
    const demoUser = {
      uid: isDoctor ? 'demo_doctor_id' : 'demo_patient_id',
      displayName: isDoctor ? 'Dr. Sarah Jenkins' : 'John Doe',
      email: isDoctor ? 'sarah.jenkins@gponline.com' : 'john.doe@gmail.com',
      photoURL: isDoctor 
        ? 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150' 
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    };
    
    // Save state
    localStorage.setItem('gp_demo_user', JSON.stringify(demoUser));
    localStorage.setItem('gp_demo_usertype', role);
    
    // Dispatch standard event
    window.dispatchEvent(new Event('demo_db_update'));
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left Side: Pitch and Auth */}
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
            <Heart className="w-3.5 h-3.5 fill-blue-600" />
            <span>Modern Healthcare Management Portal</span>
          </div>

          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
            Manage your health <span className="text-blue-600">smartly & instantly.</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            GP Online is a medical workspace bridging the gap between general practitioners and patients. 
            Schedule physical exams, receive critical reminders, and balance your schedules effortlessly.
          </p>
          
          <div className="space-y-6">
            {/* Real Authentication */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">System Access</h3>
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google logo" referrerPolicy="no-referrer" />
                Sign in with Google
              </button>
            </div>

            {/* Sandbox Sandbox Mode */}
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 text-blue-500/10">
                <TestTube className="w-24 h-24 rotate-12" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2 text-blue-800">
                  <Sparkles className="w-4 h-4 fill-blue-500 text-blue-500" />
                  <h4 className="font-bold text-sm tracking-tight">Instant Demo Simulator</h4>
                </div>
                <p className="text-xs text-gray-500 mb-4 max-w-sm leading-relaxed">
                  Bypass Firebase authentication settings and explore all features immediately. Patient scheduling and doctor calendar sync can be fully tested in sync together!
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => startDemo('doctor')}
                    className="bg-white hover:bg-blue-600 hover:text-white text-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-sm flex items-center gap-1.5"
                  >
                    <span>Log in as Dr. Jenkins (GP)</span>
                  </button>
                  <button
                    onClick={() => startDemo('patient')}
                    className="bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-emerald-200 shadow-sm flex items-center gap-1.5"
                  >
                    <span>Log in as John Doe (Patient)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex gap-8 items-center text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Secure Integration</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Automatic Google Sync</span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Mock Feed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="bg-blue-600/5 absolute -inset-4 rounded-[4rem] -z-10 blur-2xl"></div>
          <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
             <div className="bg-gray-50 p-8 rounded-[2rem]">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Bell className="w-6 h-6 text-emerald-600 animate-bounce" />
                     </div>
                     <div>
                        <div className="font-bold text-sm text-gray-800">Appointment Confirmed</div>
                        <div className="text-xs text-gray-400">Dr. Sarah Jenkins • Today at 09:30 AM</div>
                     </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 opacity-75">
                     <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CalendarCheck2 className="w-6 h-6 text-blue-600" />
                     </div>
                     <div>
                        <div className="font-bold text-sm text-gray-800">Weekly Schedule Prepared</div>
                        <div className="text-xs text-gray-400">Automatically generated for Sunday</div>
                     </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 opacity-50">
                     <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                     </div>
                     <div>
                        <div className="font-bold text-sm text-gray-800">SMS Reminders Active</div>
                        <div className="text-xs text-gray-400">Dispatched 1 hour before slots</div>
                     </div>
                  </div>
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-24 grid md:grid-cols-3 gap-8">
        <FeatureCard 
          title="Calendar Synchronization"
          description="Seamless two-way automatic updates linking with Google Calendar, Outlook, and local GP diaries."
        />
        <FeatureCard 
          title="Intelligent Reminders"
          description="Keep appointment attendance secure with automated push notifications and status update triggers."
        />
        <FeatureCard 
          title="Weekly Medical Breakdown"
          description="Doctors receive a comprehensive breakdown of patient appointments and shifts for the upcoming week."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-1 bg-blue-600 mb-6 rounded-full"></div>
      <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
