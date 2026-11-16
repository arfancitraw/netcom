import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  AlertTriangle,
  Clock,
  Database,
  Cpu,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isMobileNavOpen, closeMobileNav }) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'daily-revenue',
      label: 'Daily Revenue',
      icon: LineChart,
    },
    {
      id: 'anomalies',
      label: 'Anomaly Detection',
      icon: AlertTriangle,
    },
    {
      id: 'unshipped',
      label: 'Unshipped Orders',
      icon: Clock,
    },
    {
      id: 'crud',
      label: 'Data Manager',
      icon: Database,
    },
    {
      id: 'architecture',
      label: 'Architecture & Scale',
      icon: Cpu,
    }
  ];

  const handleNavSelect = (itemId) => {
    setActiveTab(itemId);
    if (closeMobileNav) {
      closeMobileNav();
    }
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full">
      <nav aria-label="Main Navigation" className="space-y-1">
        <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavSelect(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-3 border-t border-slate-200/80 px-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>netcom_ecommerce_db</span>
        <span className="font-mono text-slate-500">v1.0</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-slate-200/80 flex-col p-3 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeMobileNav}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="relative w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col p-4 shadow-xl z-10"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900">Navigation</span>
              <button
                onClick={closeMobileNav}
                aria-label="Close navigation"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
