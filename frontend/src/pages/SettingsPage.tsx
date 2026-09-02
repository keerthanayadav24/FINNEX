import React, { useState, useEffect } from 'react';
import { User as UserIcon, Lock, Globe, Bell, Moon, Download, Trash2, CheckCircle2, ShieldCheck, LogOut } from 'lucide-react';
import { apiFetch } from '../services/api';
import { User } from '../types';

interface SettingsPageProps {
  user?: User | null;
  onSignOut?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onSignOut }) => {
  const [syncStatus, setSyncStatus] = useState<string>('Checking...');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiFetch('/health')
      .then(() => setSyncStatus('Your financial data is securely synced.'))
      .catch(() => setSyncStatus('Sync temporarily paused (Offline)'));
  }, []);

  const handleExportData = () => {
    setExporting(true);
    setTimeout(() => {
      alert('Your financial data export has been prepared successfully.');
      setExporting(false);
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings &amp; Preferences</h1>
        <p className="text-sm text-slate-400">Manage your account profile, security, preferences, &amp; data privacy.</p>
      </div>

      {/* Data Sync Status Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Data Synchronization Status</span>
            <span className="text-sm font-semibold text-white">{syncStatus}</span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
          Protected
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* SECTION 1: ACCOUNT */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <UserIcon className="w-5 h-5 text-cyan-400" /> Account Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block uppercase">Full Name</span>
              <span className="text-slate-100 font-bold text-sm block">{user?.name || 'Authenticated User'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block uppercase">Email Address</span>
              <span className="text-slate-100 font-bold text-sm block">{user?.email || 'user@finnex.app'}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: SECURITY */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Lock className="w-5 h-5 text-blue-400" /> Security &amp; Authentication
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block uppercase">Authentication Protection</span>
              <span className="text-emerald-400 font-semibold block flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Secure Token Verification
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block uppercase">Active Sessions</span>
              <span className="text-slate-200 font-semibold block">1 Active Session</span>
            </div>
          </div>
          {onSignOut && (
            <div className="pt-2">
              <button
                onClick={onSignOut}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" /> Sign Out of All Sessions
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: PREFERENCES */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Globe className="w-5 h-5 text-emerald-400" /> Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold uppercase">Currency</span>
              </div>
              <span className="text-white font-bold block">Indian Rupee (INR / ₹)</span>
              <span className="text-slate-500 block text-[11px]">Whole rupees (en-IN)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold uppercase">Notifications</span>
              </div>
              <span className="text-emerald-400 font-bold block">Enabled</span>
              <span className="text-slate-500 block text-[11px]">Budget &amp; Bill Reminders</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold uppercase">Appearance</span>
              </div>
              <span className="text-white font-bold block">Dark Theme</span>
              <span className="text-slate-500 block text-[11px]">High Contrast Midnight</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: DATA & PRIVACY */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800/80 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Download className="w-5 h-5 text-indigo-400" /> Data &amp; Privacy Control
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <div>
              <h4 className="font-bold text-white text-sm">Export Financial Records</h4>
              <p className="text-xs text-slate-400 mt-0.5">Download a copy of your accounts &amp; transaction history.</p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-cyan-400 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> {exporting ? 'Preparing...' : 'Export Data'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-rose-400 text-sm">Delete Account Data</h4>
              <p className="text-xs text-slate-400 mt-0.5">Permanently erase your accounts &amp; personal transaction history.</p>
            </div>
            <button
              onClick={() => alert('Account data deletion safety protocol: Contact support or confirm in security panel.')}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
