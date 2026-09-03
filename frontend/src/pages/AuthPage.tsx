import React, { useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { setDevUserId } from '../services/api';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('rohan@finnex.app');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Rohan');
  const [loading, setLoading] = useState(false);

  const handleAuth = (targetEmail: string) => {
    setLoading(true);
    let resolvedId = targetEmail.trim().toLowerCase();

    // Map rohan@finnex.app or demo credentials to Rohan's existing PostgreSQL user record ID
    if (resolvedId === 'rohan@finnex.app' || resolvedId.includes('rohan') || resolvedId.includes('demo')) {
      resolvedId = 'dev_user_demo_123';
    }

    setDevUserId(resolvedId);

    setTimeout(() => {
      setLoading(false);
      onAuthSuccess();
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuth(email);
  };

  const handleDemoSignIn = () => {
    setEmail('rohan@finnex.app');
    handleAuth('rohan@finnex.app');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto text-slate-950 font-black shadow-xl shadow-cyan-500/20">
            <ShieldCheck className="w-8 h-8 text-slate-950" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">FINNEX</h1>
            <p className="text-xs text-cyan-400 font-semibold tracking-wider uppercase mt-1">Personal Finance &amp; Wealth Management</p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Access your financial accounts, budget pacing, goals, &amp; scenario simulations.
          </p>
        </div>

        {/* Quick Demo Sign In Banner }
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Rohan Demo Account
            </div>
            <p className="text-[11px] text-slate-400">Pre-loaded with financial data &amp; accounts</p>
          </div>
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all shrink-0 flex items-center gap-1.5"
          >
            Launch Demo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div> */}

        {/* Auth Mode Toggle */}
        <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'signin'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'signup'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <UserPlus className="w-4 h-4" /> Sign Up
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                'Signing In...'
              ) : mode === 'signin' ? (
                <>
                  Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Create Account &amp; Get Started <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          🔒 End-to-end data security. Your financial information is encrypted &amp; strictly private.
        </p>
      </div>
    </div>
  );
};
