import React from 'react';
import { Activity, DollarSign, RefreshCw, Terminal, ShieldAlert, TrendingUp } from 'lucide-react';

interface SidebarProps {
  role: 'MERCHANT' | 'SUPER_ADMIN';
  setRole: (role: 'MERCHANT' | 'SUPER_ADMIN') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isBackendConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  setRole,
  activeTab,
  setActiveTab,
  isBackendConnected,
}) => {
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
        <div style={{ background: 'var(--primary-gradient)', padding: '8px', borderRadius: '8px' }}>
          <TrendingUp size={24} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>PayNexus</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LEDGER & SETTLEMENTS</span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button 
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'overview' ? 'none' : '1px solid var(--panel-border)' }}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} /> Overview
          </button>
          <button 
            className={`btn ${activeTab === 'payments' ? 'btn-primary' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'payments' ? 'none' : '1px solid var(--panel-border)' }}
            onClick={() => setActiveTab('payments')}
          >
            <DollarSign size={18} /> Payments
          </button>
          <button 
            className={`btn ${activeTab === 'refunds' ? 'btn-primary' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'refunds' ? 'none' : '1px solid var(--panel-border)' }}
            onClick={() => setActiveTab('refunds')}
          >
            <RefreshCw size={18} /> Refunds
          </button>
          <button 
            className={`btn ${activeTab === 'developer' ? 'btn-primary' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'developer' ? 'none' : '1px solid var(--panel-border)' }}
            onClick={() => setActiveTab('developer')}
          >
            <Terminal size={18} /> Developers
          </button>
          {role === 'SUPER_ADMIN' && (
            <>
              <div style={{ height: '1px', background: 'var(--panel-border)', margin: '15px 0' }} />
              <button 
                className={`btn ${activeTab === 'admin' ? 'btn-primary' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start', border: activeTab === 'admin' ? 'none' : '1px solid var(--panel-border)' }}
                onClick={() => setActiveTab('admin')}
              >
                <ShieldAlert size={18} /> Risk & Audit
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
        {/* Connection Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isBackendConnected ? 'var(--success)' : 'var(--warning)',
            boxShadow: isBackendConnected ? '0 0 10px var(--success)' : '0 0 10px var(--warning)'
          }} />
          <span>{isBackendConnected ? 'Backend Live' : 'Simulated Offline'}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONSOLE VIEW</span>
          <select 
            value={role} 
            onChange={(e) => {
              setRole(e.target.value as 'MERCHANT' | 'SUPER_ADMIN');
              setActiveTab('overview');
            }}
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            <option value="MERCHANT">Merchant Panel</option>
            <option value="SUPER_ADMIN">Admin Gateway Panel</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
