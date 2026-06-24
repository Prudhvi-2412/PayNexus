import React, { useState } from 'react';
import { Activity, DollarSign, RefreshCw, Terminal, ShieldAlert, ArrowRightLeft, Bell, Search, User, ChevronDown, Sparkles } from 'lucide-react';

interface NavbarProps {
  role: 'MERCHANT' | 'SUPER_ADMIN';
  setRole: (role: 'MERCHANT' | 'SUPER_ADMIN') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  setRole,
  activeTab,
  setActiveTab,
  isBackendConnected,
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-emerald-100/50 bg-white/80 backdrop-blur-md shadow-sm shadow-emerald-50/10">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
        <div className="flex h-[72px] items-center justify-between">
          
          {/* LEFT: BRAND LOGO */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-secondary text-white shadow-lg shadow-primary/20">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">PayNexus</span>
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-secondary uppercase border border-emerald-200/50">Enterprise</span>
            </div>
          </div>

          {/* CENTER: NAVIGATION LINKS */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 ${
                activeTab === 'overview'
                  ? 'bg-primary/8 text-primary shadow-sm shadow-primary/5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Activity size={16} /> Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 ${
                activeTab === 'payments'
                  ? 'bg-primary/8 text-primary shadow-sm shadow-primary/5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <DollarSign size={16} /> Payments
            </button>

            <button
              onClick={() => setActiveTab('settlements')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 ${
                activeTab === 'settlements'
                  ? 'bg-primary/8 text-primary shadow-sm shadow-primary/5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <ArrowRightLeft size={16} /> Settlements
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 ${
                activeTab === 'ledger'
                  ? 'bg-primary/8 text-primary shadow-sm shadow-primary/5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <RefreshCw size={16} /> Ledger
            </button>

            <button
              onClick={() => setActiveTab('developer')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 ${
                activeTab === 'developer'
                  ? 'bg-primary/8 text-primary shadow-sm shadow-primary/5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Terminal size={16} /> Developers
            </button>

            {role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 ${
                  activeTab === 'admin'
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100/50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <ShieldAlert size={16} /> Risk Center
              </button>
            )}
          </div>

          {/* RIGHT: SEARCH, NOTIFICATION, PROFILE & ROLE */}
          <div className="flex items-center gap-5">
            
            {/* EXPANDED SEARCH BAR */}
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search transactions, orders, payouts..."
                className="w-64 rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* BACKEND STATUS INDICATOR */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 border border-emerald-100/50">
              <span className="h-2 w-2 rounded-full bg-primary pulse-online" />
              <span className="hidden sm:inline text-secondary font-bold">{isBackendConnected ? 'Active' : 'Offline Mode'}</span>
            </div>

            {/* NOTIFICATIONS */}
            <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
              </span>
            </button>

            {/* PROFILE / ROLE DROPDOWN */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  <User size={16} />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold leading-3 text-slate-800">
                    {role === 'SUPER_ADMIN' ? 'System Admin' : 'Merchant Portal'}
                  </p>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Apex Retailers</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Switch Workspaces</p>
                  </div>
                  <button
                    onClick={() => {
                      setRole('MERCHANT');
                      setActiveTab('overview');
                      setShowProfileDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-lg transition-colors ${
                      role === 'MERCHANT' ? 'bg-primary/8 text-primary' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Merchant Workspace
                  </button>
                  <button
                    onClick={() => {
                      setRole('SUPER_ADMIN');
                      setActiveTab('overview');
                      setShowProfileDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-lg transition-colors ${
                      role === 'SUPER_ADMIN' ? 'bg-primary/8 text-primary' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Super Admin Console
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
