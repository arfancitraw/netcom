import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Layers,
  Menu,
  X
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isMobileNavOpen, toggleMobileNav }) {
  const { user, logout, role } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileNavOpen}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          {isMobileNavOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center font-bold text-white shrink-0">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900 tracking-tight">
              Netcom
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Analytics
            </span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Production
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-400">1.45M events</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.full_name || user.username}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {role}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
