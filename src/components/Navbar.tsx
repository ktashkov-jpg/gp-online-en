import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserType } from '../types';
import { Stethoscope, LogOut, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SimpleUser } from '../App';

interface NavbarProps {
  user: SimpleUser | null;
  userType: UserType | null;
}

export default function Navbar({ user, userType }: NavbarProps) {
  const handleSignOut = async () => {
    // Clear any simulated sandbox session
    localStorage.removeItem('gp_demo_user');
    localStorage.removeItem('gp_demo_usertype');
    window.dispatchEvent(new Event('demo_db_update'));
    
    // Attempt standard Firebase Auth signout
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase logout error:", err);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 py-4 shadow-sm">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Stethoscope className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">GP Online</span>
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{userType === UserType.DOCTOR ? 'Doctor Dashboard' : 'My Appointments'}</span>
            </div>
            
            {user.isDemo && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-200">
                Sandbox Demo
              </span>
            )}

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">{user.displayName || 'Unknown User'}</div>
                <div className="text-xs text-gray-500 capitalize">{userType === UserType.DOCTOR ? 'General Practitioner (GP)' : 'Patient'}</div>
              </div>
              {user.photoURL && (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-gray-100" referrerPolicy="no-referrer" />
              )}
              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                title="Log Out"
                id="navbar-logout-btn"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
