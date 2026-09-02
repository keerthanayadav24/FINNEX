import React from 'react';
import { Bell, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsPageProps {
  notifications: Notification[];
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'ALERT':
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications &amp; Alerts</h1>
        <p className="text-sm text-slate-400">Stay updated on budget alerts, savings goals, &amp; payment reminders.</p>
      </div>

      <div className="space-y-4">
        {notifications.map((n) => (
          <div key={n.id} className="p-5 rounded-2xl glass-card border border-slate-800/80 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              {getIcon(n.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">{n.title}</h3>
                <span className="text-xs text-slate-500 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
