import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, Eye, EyeOff, UserPlus, HelpCircle, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface NurseLoginProps {
  onSwitchToAdmin: () => void;
}

export const NurseLogin: React.FC<NurseLoginProps> = ({ onSwitchToAdmin }) => {
  const { login, registerNurse } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    staffId: '',
    department: 'Casualty / Emergency Resuscitation',
  });
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please provide your registered nurse username/email and password.');
      return;
    }

    setIsLoading(true);
    const result = await login(identifier, password, 'nurse');
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to authenticate.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMessage(null);

    if (!regData.fullName || !regData.email || !regData.username || !regData.password) {
      setRegError('All required fields marked with * must be filled.');
      return;
    }

    setIsRegistering(true);
    const res = await registerNurse(regData);
    setIsRegistering(false);

    if (res.success) {
      setRegSuccessMessage(
        res.message || 'Account requested successfully. It is now awaiting Doctor/Admin approval before you can log in.'
      );
      setRegData({
        fullName: '',
        email: '',
        username: '',
        password: '',
        staffId: '',
        department: 'Casualty / Emergency Resuscitation',
      });
    } else {
      setRegError(res.error || 'Registration request failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4 shadow-inner">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Emergency Nurse Station</h1>
        <p className="mt-1.5 text-xs text-teal-200/70 tracking-wide uppercase font-semibold">
          Trauma Care & Casualty Register
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-teal-800/40 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-2xl shadow-2xl">
          {/* Role pill indicator */}
          <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Portal:</span>
            <span className="font-semibold text-teal-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
              Nursing Staff Access
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
                Nurse Username or Hospital Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter nurse username or hospital email"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-600"
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
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
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
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-600 font-mono"
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
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In to Nurse Station'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 transition-colors border border-slate-700/60"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-400" />
              Request New Nurse Account
            </button>

            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <span>Are you a Doctor / Administrator?</span>
              <span className="text-teal-400 font-semibold flex items-center">
                Go to Doctor Portal <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </button>
          </div>
        </div>

        {/* Security notice footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized hospital personnel only. All access attempts are recorded in the security audit log.
        </p>
      </div>

      {/* Request Account Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-teal-800/60 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Request Nurse Account</h3>
                <p className="text-xs text-slate-400">Requires Medical Superintendent / Admin approval</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {regSuccessMessage ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto" />
                <h4 className="text-sm font-semibold text-white">Request Submitted</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{regSuccessMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setRegSuccessMessage(null);
                  }}
                  className="mt-4 px-4 py-2 bg-teal-500 text-slate-950 font-semibold rounded-xl text-xs"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                {regError && (
                  <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200">
                    {regError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    value={regData.fullName}
                    onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                    placeholder="Staff Nurse Preethi S."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Hospital Email *</label>
                    <input
                      type="email"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      placeholder="preethi@hospital.org"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Username *</label>
                    <input
                      type="text"
                      value={regData.username}
                      onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                      placeholder="nurse_preethi"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Staff ID</label>
                    <input
                      type="text"
                      value={regData.staffId}
                      onChange={(e) => setRegData({ ...regData, staffId: e.target.value })}
                      placeholder="NUR-4380"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Department</label>
                    <input
                      type="text"
                      value={regData.department}
                      onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Desired Password *</label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-800/40 text-teal-300 text-[11px] leading-relaxed">
                  Hospital Policy Note: Accounts are created in <strong>Pending Approval</strong> state.
                  You will only be able to log in after verification by a Doctor / Administrator.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold cursor-pointer"
                  >
                    {isRegistering ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-200">
            <div className="flex items-center gap-2 mb-3 text-teal-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Password Recovery</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              In accordance with hospital clinical security standards, staff nurse password resets must be issued by the Chief Medical Officer or Emergency IT Administrator.
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Please contact the Emergency Command Room (Ext: 104) or have the Doctor/Admin reset your credentials from the Nurse Management console.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
