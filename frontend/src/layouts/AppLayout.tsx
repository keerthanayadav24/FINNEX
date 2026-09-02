import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

interface AppLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onRefresh: () => void;
  onSignOut?: () => void;
  notificationCount?: number;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  setActiveTab,
  user,
  onRefresh,
  onSignOut,
  notificationCount = 0,
  children,
}) => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onRefresh={onRefresh} onSignOut={onSignOut} onNavigateTab={setActiveTab} notificationCount={notificationCount} />
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
