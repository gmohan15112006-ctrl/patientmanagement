import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NurseLogin } from './components/NurseLogin';
import { AdminLogin } from './components/AdminLogin';
import { NurseDashboard } from './components/NurseDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AlertCircle, ShieldAlert } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  // Portal route state: 'nurse' | 'admin'
  const [activePortal, setActivePortal] = useState<'nurse' | 'admin'>('nurse');
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Sync with URL hash if provided (e.g. #admin or #nurse)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        setActivePortal('admin');
      } else if (hash === '#nurse') {
        setActivePortal('nurse');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Update hash when activePortal changes
  const switchPortal = (portal: 'nurse' | 'admin') => {
    setActivePortal(portal);
    window.location.hash = portal;
    setAccessDeniedMessage(null);
  };

  // If user is logged in as a nurse and attempts to navigate to admin portal
  useEffect(() => {
    if (user && user.role === 'nurse' && activePortal === 'admin') {
      setAccessDeniedMessage('Access Denied: Administrative privileges required. Redirected to Nurse Station.');
      setActivePortal('nurse');
      window.location.hash = 'nurse';
    }
  }, [user, activePortal]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Initializing Hospital Security System...
        </p>
      </div>
    );
  }

  // If user is authenticated:
  if (user) {
    return (
      <div>
        {accessDeniedMessage && (
          <div className="bg-red-900 text-red-100 px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-300" />
            <span>{accessDeniedMessage}</span>
          </div>
        )}

        {user.role === 'doctor_admin' ? (
          <AdminDashboard />
        ) : (
          <NurseDashboard />
        )}
      </div>
    );
  }

  // If not authenticated, render dedicated login page:
  return (
    <div>
      {accessDeniedMessage && (
        <div className="bg-red-900 text-red-100 px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-300" />
          <span>{accessDeniedMessage}</span>
        </div>
      )}

      {activePortal === 'admin' ? (
        <AdminLogin onSwitchToNurse={() => switchPortal('nurse')} />
      ) : (
        <NurseLogin onSwitchToAdmin={() => switchPortal('admin')} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
