import React, { useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { setDevUserId } from '../services/api';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('rohan@finnex.app');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Rohan');
  const [customId, setCustomId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let targetId = customId.trim();
    if (!targetId) {
      if (email.toLowerCase().includes('rohan') || email.toLowerCase().includes('demo') || mode === 'signin') {
        targetId = 'dev_user_demo_123';
      } else {
        targetId = `user_${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      }
    }

    setDevUserId(targetId);

    setTimeout(() => {
      setLoading(false);
      onAuthSuccess();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
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
            Sign in to access your financial accounts, budget pacing, goals, &amp; scenario simulations.
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setEmail('rohan@finnex.app');
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'signin'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setEmail('');
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'signup'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Sign Up
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
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
                'Authenticating...'
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
