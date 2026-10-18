import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onSwitchToNurse: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSwitchToNurse }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please provide your administrator email/username and secure password.');
      return;
    }

    setIsLoading(true);
    const result = await login(identifier, password, 'doctor_admin');
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify administrative credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Doctor / Admin Portal</h1>
        <p className="mt-1.5 text-xs text-indigo-200/70 tracking-wide uppercase font-semibold">
          Emergency Command & Patient Data Governance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-indigo-900/40 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-2xl shadow-2xl">
          {/* Role badge */}
          <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Security Clearance:</span>
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              Doctor / Clinical Administrator
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter administrator email or username"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-600 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'Authenticating Admin...' : 'Access Administration Console'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={onSwitchToNurse}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Staff Nurse? Return to Nurse Emergency Station</span>
            </button>
          </div>
        </div>

        {/* Security policy footnote */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>Strict Privilege Protection: Administrator roles cannot be self-registered.</p>
          <p>Protected by Row Level Security (RLS) & Server Session Verification.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-200">
            <div className="flex items-center gap-2 mb-3 text-indigo-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Administrator Recovery</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To prevent unauthorized privilege escalation, administrator credentials can only be rotated via direct server environment variable configuration (<code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">INITIAL_ADMIN_PASSWORD</code>) or by direct database intervention.
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Please contact system administration if you require credential assistance.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
