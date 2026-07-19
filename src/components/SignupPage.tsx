import React, { useState } from 'react';
import { School, User, Lock, ArrowRight, ShieldCheck, Database, ChevronRight, Phone } from 'lucide-react';

interface SignupPageProps {
  onBackToLogin: () => void;
}

export default function SignupPage({ onBackToLogin }: SignupPageProps) {
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !loginId || !password) {
      setError('Name, Login ID, and Password are required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, name, login_id: loginId, password, contact })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Signup failed.');
      } else {
        setSuccess('Account created! Please wait for an admin to approve your account before logging in.');
        setName('');
        setLoginId('');
        setPassword('');
        setContact('');
      }
    } catch (err: any) {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(24,45,102,0.25),transparent_35%),linear-gradient(135deg,#08111f_0%,#0f1d38_45%,#14285a_100%)] text-white flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1.2fr_0.8fr] overflow-hidden rounded-4xl border border-white/10 bg-white/8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        
        {/* Left Side (Branding) */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-[linear-gradient(160deg,rgba(24,45,102,0.92),rgba(13,26,52,0.96))] border-r border-white/10">
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(217,83,79,0.45),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_24%)]" />
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#182D66] shadow-lg">
                <School className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Rana School</p>
                <h1 className="text-2xl font-bold leading-tight">Management System</h1>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <h2 className="text-4xl font-black tracking-tight xl:text-5xl mt-6">
                Join your school community.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-white/70">
                Register as a student to check your attendance and fee records, or as a teacher to manage your classes and view your schedule.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mt-8">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <p className="mt-3 text-sm font-semibold text-white">Admin Approval</p>
                <p className="mt-1 text-xs leading-5 text-white/60">Accounts are securely verified before granting access.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <Database className="h-5 w-5 text-blue-400" />
                <p className="mt-3 text-sm font-semibold text-white">Centralized Data</p>
                <p className="mt-1 text-xs leading-5 text-white/60">All your academic records safely stored in one place.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Form) */}
        <div className="p-6 sm:p-8 lg:p-10 xl:p-14 bg-[#F8FAFC] text-slate-900 relative">
          <button 
            onClick={onBackToLogin}
            className="absolute top-6 left-6 text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
          >
            ← Back to Login
          </button>
          
          <div className="mx-auto max-w-md mt-8">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Create an Account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Register to access the school portal.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm flex flex-col gap-3">
                <p>{success}</p>
                <button onClick={onBackToLogin} className="text-emerald-800 font-semibold underline text-left">
                  Return to Login
                </button>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSignup} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-7">
                
                {/* Role Selector */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${role === 'student' ? 'bg-white shadow-sm text-[#182D66]' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${role === 'staff' ? 'bg-white shadow-sm text-[#182D66]' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Teacher
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><User className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#182D66] focus:bg-white focus:ring-2 focus:ring-[#182D66]/20" placeholder="John Doe" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Login ID</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><User className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" required value={loginId} onChange={e => setLoginId(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#182D66] focus:bg-white focus:ring-2 focus:ring-[#182D66]/20" placeholder="johndoe_123" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Lock className="h-5 w-5 text-slate-400" /></div>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#182D66] focus:bg-white focus:ring-2 focus:ring-[#182D66]/20" placeholder="••••••••" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Contact Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Phone className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#182D66] focus:bg-white focus:ring-2 focus:ring-[#182D66]/20" placeholder="03001234567" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex w-full mt-2 items-center justify-center gap-2 rounded-xl bg-[#182D66] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#182D66]/20 transition hover:bg-[#1f3a84] focus:outline-none focus:ring-4 focus:ring-[#182D66]/20 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
