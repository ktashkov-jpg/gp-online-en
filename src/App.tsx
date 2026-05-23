import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserType } from './types';
import Home from './pages/Home';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import Navbar from './components/Navbar';
import AuthGuard from './components/AuthGuard';
import { User, Stethoscope } from 'lucide-react';

export interface SimpleUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

export default function App() {
  const [user, setUser] = useState<SimpleUser | null>(() => {
    const demoUser = localStorage.getItem('gp_demo_user');
    return demoUser ? JSON.parse(demoUser) : null;
  });
  const [userType, setUserType] = useState<UserType | null>(() => {
    const demoType = localStorage.getItem('gp_demo_usertype');
    return demoType ? (demoType as UserType) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // If we are in demo mode, preserve demo mock session
      const isDemoActive = !!localStorage.getItem('gp_demo_user');
      if (isDemoActive) {
        setLoading(false);
        return;
      }

      setLoading(true);
      if (authUser) {
        setUser(authUser);
        try {
          const doctorDoc = await getDoc(doc(db, 'doctors', authUser.uid));
          if (doctorDoc.exists()) {
            setUserType(UserType.DOCTOR);
          } else {
            const patientDoc = await getDoc(doc(db, 'patients', authUser.uid));
            if (patientDoc.exists()) {
              setUserType(UserType.PATIENT);
            }
          }
        } catch (err) {
          console.error("Profile check failed:", err);
        }
      } else {
        setUser(null);
        setUserType(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for demo changes to update state across tabs / triggers
  useEffect(() => {
    const handleDemoUpdate = () => {
      const demoUser = localStorage.getItem('gp_demo_user');
      const demoType = localStorage.getItem('gp_demo_usertype');
      if (demoUser && demoType) {
        setUser({ ...JSON.parse(demoUser), isDemo: true });
        setUserType(demoType as UserType);
      } else if (!localStorage.getItem('gp_demo_user')) {
        // Only clear if demo user is totally logged out and there isn't a firebase session
        if (!auth.currentUser) {
          setUser(null);
          setUserType(null);
        } else {
          setUser(auth.currentUser);
        }
      }
    };
    window.addEventListener('demo_db_update', handleDemoUpdate);
    return () => window.removeEventListener('demo_db_update', handleDemoUpdate);
  }, []);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar_sync') === 'success') {
      setNotification("Calendar connected successfully!");
      window.history.replaceState({}, document.title, "/dashboard");
      setTimeout(() => setNotification(null), 5000);
    }
  }, []);

  if (loading && !localStorage.getItem('gp_demo_user')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar user={user} userType={userType} />
        {notification && (
          <div className="bg-green-600 text-white text-center py-2 text-sm font-bold animate-pulse">
            {notification}
          </div>
        )}
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
            <Route
              path="/dashboard"
              element={
                <AuthGuard user={user}>
                  {!userType ? (
                    <RoleSelector user={user!} setUserType={setUserType} />
                  ) : userType === UserType.DOCTOR ? (
                    <DoctorDashboard />
                  ) : (
                    <PatientDashboard />
                  )}
                </AuthGuard>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function RoleSelector({ user, setUserType }: { user: SimpleUser, setUserType: (type: UserType) => void }) {
  const [isSaving, setIsSaving] = useState<UserType | null>(null);

  const selectRole = async (type: UserType) => {
    setIsSaving(type);
    const collection = type === UserType.DOCTOR ? 'doctors' : 'patients';
    const path = `${collection}/${user.uid}`;
    const data = type === UserType.DOCTOR ? {
      uid: user.uid,
      name: user.displayName || 'Doctor',
      email: user.email,
      specialty: 'General Practice',
      workingHours: { start: '09:00', end: '17:00' },
      syncEnabled: false
    } : {
      uid: user.uid,
      name: user.displayName || 'Patient',
      email: user.email,
      phone: '',
      assignedDoctorId: ''
    };

    try {
      await setDoc(doc(db, collection, user.uid), data);
      setUserType(type);
    } catch (err) {
      console.error("Profile creation failed:", err);
      import('./lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.WRITE, path);
      });
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Welcome to Health Portal</h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Please select your role to personalize your experience and manage medical consultations.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <button
          onClick={() => selectRole(UserType.PATIENT)}
          disabled={!!isSaving}
          className="relative group p-8 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-blue-500 hover:shadow-2xl transition-all text-left disabled:opacity-50"
        >
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Patient</h2>
          <p className="text-gray-500 leading-relaxed">
            Book appointments online, consult with your primary GP, and access slot availabilities instantly.
          </p>
          {isSaving === UserType.PATIENT && (
             <div className="absolute inset-0 bg-white/80 rounded-[2rem] flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          )}
        </button>

        <button
          onClick={() => selectRole(UserType.DOCTOR)}
          disabled={!!isSaving}
          className="relative group p-8 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-green-500 hover:shadow-2xl transition-all text-left disabled:opacity-50"
        >
          <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">General Practitioner (GP)</h2>
          <p className="text-gray-500 leading-relaxed">
            Manage your daily schedule in real-time, confirm appointment requests, and sync automatically with Google Calendar.
          </p>
          {isSaving === UserType.DOCTOR && (
             <div className="absolute inset-0 bg-white/80 rounded-[2rem] flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
             </div>
          )}
        </button>
      </div>
    </div>
  );
}
