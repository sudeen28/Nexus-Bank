'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, Zap, Globe } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'user' | 'admin') => {
    if (role === 'admin') { setEmail('admin@nexusbank.com'); setPassword('Admin@123456'); }
    else { setEmail('alex@demo.com'); setPassword('User@123456'); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-navy-900 flex-col relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-navy-800/60 -top-48 -left-48" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-gold-500/5 bottom-0 right-0" />
          <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-gold-500/20 to-transparent left-1/3" />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-500 flex items-center justify-center">
              <span className="text-navy-900 font-bold text-xl font-display">N</span>
            </div>
            <span className="text-white font-display font-semibold text-xl">NexusBank</span>
          </div>

          {/* Hero content */}
          <div>
            <h2 className="text-5xl font-display font-bold text-white leading-tight mb-6">
              Banking built<br />
              for the<br />
              <span className="text-gold-400">modern world</span>
            </h2>
            <p className="text-white/50 text-lg mb-12 max-w-md">
              Secure, instant, and intelligent financial services at your fingertips.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: Shield, title: 'Bank-grade security', desc: '256-bit encryption & fraud detection' },
                { icon: Zap, title: 'Instant transfers', desc: 'Send money in seconds, anywhere' },
                { icon: Globe, title: 'Global coverage', desc: 'Available in 180+ countries' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/8">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/15 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-gold-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{title}</div>
                    <div className="text-white/40 text-xs mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/25 text-xs">© 2024 NexusBank. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
              <span className="text-gold-500 font-bold font-display">N</span>
            </div>
            <span className="font-display font-semibold text-navy-900 text-lg">NexusBank</span>
          </div>

          <h1 className="text-3xl font-display font-bold text-navy-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account</p>

          {/* Demo quick fills */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => fillDemo('user')}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:border-navy-300 hover:bg-navy-50 transition-all">
              👤 Demo User
            </button>
            <button onClick={() => fillDemo('admin')}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:border-navy-300 hover:bg-navy-50 transition-all">
              🔐 Demo Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label">Password</label>
                <button type="button" className="text-xs text-navy-600 hover:text-navy-900 font-medium">Forgot password?</button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-11"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-navy-800 font-semibold hover:text-navy-600">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
