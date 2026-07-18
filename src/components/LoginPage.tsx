import React, { useState } from 'react';
import { School, Database, Lock, User, ArrowRight, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => boolean | Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await Promise.resolve(onLogin(email, password));
      if (!success) {
        setError('Invalid credentials. Please try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(24,45,102,0.25),transparent_35%),linear-gradient(135deg,#08111f_0%,#0f1d38_45%,#14285a_100%)] text-white flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1.2fr_0.8fr] overflow-hidden rounded-4xl border border-white/10 bg-white/8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
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
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                Modern school operations, one workspace
              </span>
              <h2 className="text-4xl font-black tracking-tight xl:text-5xl">
                Fast admissions, clear fees, attendance, and reports in one place.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-white/70">
                A focused admin console for school staff to handle daily operations with cleaner navigation, better printing, and quick data access.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Secure access', 'Role-based admin login', ShieldCheck],
                ['Live records', 'Students, fees, attendance', Database],
                ['Print ready', 'Receipts, cards, reports', ArrowRight]
              ].map(([title, description, Icon]) => (
                <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-white/80" />
                  <p className="mt-3 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-white/55">
            <span className="inline-flex items-center gap-2">
              <Database className="h-4 w-4" />
              Local data layer active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Demo credentials available
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10 xl:p-14 bg-[#F8FAFC] text-slate-900">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#182D66] text-white shadow-lg">
                <School className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Sign in to your admin console</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use your school administrator account to continue.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-7">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#182D66] focus:bg-white focus:ring-4 focus:ring-[#182D66]/10"
                    placeholder="admin@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#182D66] focus:bg-white focus:ring-4 focus:ring-[#182D66]/10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#182D66] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#182D66]/20 transition hover:bg-[#1f3a84] focus:outline-none focus:ring-4 focus:ring-[#182D66]/20 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Demo access</p>
                <p className="mt-1">Email: rana@school.com</p>
                <p>Password: admin123</p>
              </div>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500 lg:text-left">
              Secure local session with browser persistence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
