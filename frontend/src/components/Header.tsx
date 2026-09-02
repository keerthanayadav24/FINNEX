import React, { useState, useEffect } from 'react';
import { User as UserIcon, RefreshCw, LogOut, Settings, ChevronDown } from 'lucide-react';

interface HeaderProps {
  user: any;
  onRefresh: () => void;
  onSignOut?: () => void;
  onNavigateTab?: (tab: string) => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ user, onRefresh, onSignOut, onNavigateTab }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const DROPDOWN_ID = 'header-profile-dropdown';

  const toggleMenu = () => {
    if (!isMenuOpen) {
      window.dispatchEvent(new CustomEvent('close-all-dropdowns', { detail: { id: DROPDOWN_ID } }));
    }
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id !== DROPDOWN_ID) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('close-all-dropdowns', handleCloseAll);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('close-all-dropdowns', handleCloseAll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Financial Control Center</h2>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Data Protected
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Consumer Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={toggleMenu}
            className="flex items-center gap-3 pl-2 border-l border-slate-800 text-left hover:opacity-90 transition-opacity focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user?.name || 'Authenticated User'}</div>
              <div className="text-[11px] text-slate-400">{user?.email || 'user@finnex.app'}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setIsMenuOpen(false)}
              />
              <div
                className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs space-y-1"
              >
                <div className="px-4 py-2 border-b border-slate-800/80">
                  <p className="font-bold text-white text-sm">{user?.name || 'Authenticated User'}</p>
                  <p className="text-slate-400 text-[11px] font-mono">{user?.email || 'user@finnex.app'}</p>
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => {
                      onNavigateTab('settings');
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 flex items-center gap-2 font-medium"
                  >
                    <Settings className="w-4 h-4 text-cyan-400" /> Settings &amp; Preferences
                  </button>
                )}

                {onSignOut && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-4 py-2.5 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium border-t border-slate-800/80"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" /> Sign Out
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
