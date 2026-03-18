'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', confirmPassword:'' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const passwordChecks = [
    { label: '8+ characters', ok: form.password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'Number', ok: /[0-9]/.test(form.password) },
    { label: 'Special character', ok: /[!@#$%^&*]/.test(form.password) },
  ];
  const passwordStrong = passwordChecks.every(c => c.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrong) { toast.error('Password does not meet requirements'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      toast.success('Account created! Please sign in.');
      router.replace('/login');
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-navy-950 flex-col relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-gold-500/5 -top-32 -right-32" />
          <div className="absolute w-[300px] h-[300px] rounded-full bg-navy-800/80 bottom-0 left-0" />
        </div>
        <div className="relative z-10 flex flex-col justify-center h-full p-12">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-gold-500 flex items-center justify-center">
              <span className="text-navy-900 font-bold text-xl font-display">N</span>
            </div>
            <span className="text-white font-display font-semibold text-xl">NexusBank</span>
          </div>
          <h2 className="text-4xl font-display font-bold text-white leading-tight mb-4">
            Start your<br /><span className="text-gold-400">financial journey</span><br />today.
          </h2>
          <p className="text-white/40 text-base mb-10">Open a full-featured digital bank account in under 2 minutes.</p>
          <div className="space-y-3">
            {['No hidden fees', 'Instant virtual card', 'Real-time notifications', 'Bank-grade security'].map(f => (
              <div key={f} className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-gold-400" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up py-8">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
              <span className="text-gold-500 font-bold font-display">N</span>
            </div>
            <span className="font-display font-semibold text-navy-900 text-lg">NexusBank</span>
          </div>

          <h1 className="text-3xl font-display font-bold text-navy-900 mb-1">Create account</h1>
          <p className="text-slate-500 text-sm mb-8">Join thousands of NexusBank customers</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input className="input" placeholder="Alex" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" placeholder="Morgan" value={form.lastName} onChange={set('lastName')} required />
              </div>
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-11" type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password" value={form.password} onChange={set('password')} required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {passwordChecks.map(({ label, ok }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        {ok && <Check size={8} />}
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                className={`input ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 focus:ring-red-400' : ''}`}
                type="password" placeholder="Repeat your password"
                value={form.confirmPassword} onChange={set('confirmPassword')} required
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            By registering, you agree to our{' '}
            <a href="#" className="text-navy-700 font-medium hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-navy-700 font-medium hover:underline">Privacy Policy</a>
          </p>
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-navy-800 font-semibold hover:text-navy-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
