import React, { useState } from 'react';
import { Plus, ArrowRightLeft, CheckCircle2, Cpu, ArrowUpRight, BarChart3, ShieldAlert, Sparkles, Server, Zap, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCards from './MetricCards';
import LedgerVisualizer from './LedgerVisualizer';
import PaymentsTable from './PaymentsTable';
import RefundsTable from './RefundsTable';
import ApiKeysManager from './ApiKeysManager';
import WebhooksManager from './WebhooksManager';
import RiskAlertsTable from './RiskAlertsTable';
import AuditLogsTable from './AuditLogsTable';

interface DashboardContentProps {
  platform: any;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ platform }) => {
  const {
    role,
    activeTab,
    payments,
    refunds,
    apiKeys,
    webhooks,
    riskAlerts,
    auditLogs,
    settlements,
    setIsOrderModalOpen,
    pendingBalance,
    settledBalance,
    platformRevenue,
    formatCentsToInr,
    formatCompactInr,
    handleTriggerSettlement,
    handleRefundClick,
    gatewayRoutes = [],
  } = platform;

  // Interactive Analytics State
  const [metricType, setMetricType] = useState<'volume' | 'fees' | 'settlements'>('volume');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Stripe-inspired charts data sets
  const analyticsData = {
    daily: [
      { name: '00:00', volume: 15000, fees: 450, settlements: 12000 },
      { name: '04:00', volume: 22000, fees: 660, settlements: 18000 },
      { name: '08:00', volume: 45000, fees: 1350, settlements: 38000 },
      { name: '12:00', volume: 78000, fees: 2340, settlements: 65000 },
      { name: '16:00', volume: 55000, fees: 1650, settlements: 48000 },
      { name: '20:00', volume: 92000, fees: 2760, settlements: 82000 },
    ],
    weekly: [
      { name: 'Mon', volume: 420000, fees: 12600, settlements: 380000 },
      { name: 'Tue', volume: 580000, fees: 17400, settlements: 520000 },
      { name: 'Wed', volume: 480000, fees: 14400, settlements: 410000 },
      { name: 'Thu', volume: 750000, fees: 22500, settlements: 680000 },
      { name: 'Fri', volume: 890000, fees: 26700, settlements: 810000 },
      { name: 'Sat', volume: 630000, fees: 18900, settlements: 570000 },
      { name: 'Sun', volume: 950000, fees: 28500, settlements: 900000 },
    ],
    monthly: [
      { name: 'Jan', volume: 1800000, fees: 54000, settlements: 1600000 },
      { name: 'Feb', volume: 2400000, fees: 72000, settlements: 2100000 },
      { name: 'Mar', volume: 3100000, fees: 93000, settlements: 2800000 },
      { name: 'Apr', volume: 2900000, fees: 87000, settlements: 2600000 },
      { name: 'May', volume: 4200000, fees: 126000, settlements: 3900000 },
      { name: 'Jun', volume: 5100000, fees: 153000, settlements: 4800000 },
    ],
  };

  const getMetricKey = () => {
    if (metricType === 'fees') return 'fees';
    if (metricType === 'settlements') return 'settlements';
    return 'volume';
  };

  // Helper to find routing stats for gateways
  const getRouteInfo = (name: string) => {
    const route = gatewayRoutes.find((r: any) => r.gateway === name);
    return route || { successRate: '100%', totalTxCount: 0, status: 'OPERATIONAL' };
  };

  const hdfcRoute = getRouteInfo('HDFC');
  const iciciRoute = getRouteInfo('ICICI');

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 sm:px-8 lg:px-10">
      
      {/* 1. HERO EXECUTIVE COMMAND CENTER */}
      {activeTab === 'overview' && (
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50/50 via-white to-white p-8 lg:p-12 shadow-sm rupee-pattern-bg">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-emerald-100/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 -mb-10 h-48 w-48 rounded-full bg-teal-50/40 blur-2xl" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-1.5 text-xs font-bold text-secondary border border-primary/10">
                <Sparkles size={13} className="animate-spin text-secondary" />
                PayNexus Command Center
              </span>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-tight">
                India's Enterprise <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Payment Infrastructure</span>
              </h1>
              <p className="mt-4 text-base lg:text-lg text-slate-500 leading-relaxed max-w-2xl">
                Monitor UPI routing loops, IMPS bank rails, automated ledger reconciliation status, and compliance audit histories in a single terminal.
              </p>

              {/* QUICK INFO STATUS CHIPS */}
              <div className="mt-8 flex flex-wrap gap-3.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm border border-slate-100">
                  <span className="h-2 w-2 rounded-full bg-primary pulse-online" />
                  Nodal Routing: <span className="text-slate-900 font-bold">Optimized</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm border border-slate-100">
                  IMPS Rails: <span className="text-secondary font-bold">99.98% success</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm border border-slate-100">
                  Failover: <span className="text-secondary font-bold">Automatic Active</span>
                </div>
              </div>
            </div>

            {/* ILLUSTRATIVE QUICK CONTROLS */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 self-start lg:self-center w-full sm:w-auto min-w-[240px]">
              {role === 'MERCHANT' ? (
                <button
                  onClick={() => setIsOrderModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Plus size={18} /> Test Order Capture
                </button>
              ) : (
                <button
                  onClick={handleTriggerSettlement}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <ArrowRightLeft size={18} /> Trigger Settlement Batch
                </button>
              )}
              
              <button 
                onClick={() => {
                  const el = document.getElementById('ops-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all hover:scale-105 cursor-pointer"
              >
                <Server size={16} /> Check System Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. OVERVIEW TAB SCREEN */}
      {activeTab === 'overview' && (
        <div className="space-y-12">
          
          {/* KPI METRIC CARDS */}
          <MetricCards 
            role={role}
            settledBalance={settledBalance}
            pendingBalance={pendingBalance}
            payments={payments}
            riskAlerts={riskAlerts}
            platformRevenue={platformRevenue}
            formatCentsToUsd={formatCompactInr}
          />

          {/* STRIPE-INSPIRED PREMIUM INTERACTIVE ANALYTICS CHART */}
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Platform Analytics Panel</h3>
                <p className="text-xs text-slate-500 mt-1">Stripe-style transaction flows and service processing fees</p>
              </div>

              {/* CONTROLS */}
              <div className="flex flex-wrap gap-4 items-center">
                {/* Metric Selectors */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/50">
                  <button
                    onClick={() => setMetricType('volume')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      metricType === 'volume' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Volume
                  </button>
                  <button
                    onClick={() => setMetricType('fees')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      metricType === 'fees' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Platform Fees
                  </button>
                  <button
                    onClick={() => setMetricType('settlements')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      metricType === 'settlements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Settlements
                  </button>
                </div>

                {/* Time Range Selectors */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/50">
                  <button
                    onClick={() => setTimeRange('daily')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      timeRange === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    24h
                  </button>
                  <button
                    onClick={() => setTimeRange('weekly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      timeRange === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setTimeRange('monthly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      timeRange === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    6m
                  </button>
                </div>
              </div>
            </div>
            
            {/* Recharts Area Chart */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData[timeRange]}>
                  <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(v) => metricType === 'volume' || metricType === 'settlements' ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, metricType.toUpperCase()]} />
                  <Area type="monotone" dataKey={getMetricKey()} stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. ENTERPRISE GATEWAY OPERATIONS SECTION */}
          <div id="ops-section" className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-primary" size={20} />
              <div>
                <h3 className="text-xl font-bold text-slate-900">National Payments Infrastructure Status</h3>
                <p className="text-xs text-slate-500">Live heartbeat monitoring of Indian payment rails and active bank route failovers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between h-36">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">UPI Rail</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">NCPI Loop</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2 py-0.5 text-[10px] font-bold text-secondary border border-primary/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-online" /> Operational
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-xs text-slate-400">Response time</span>
                  <p className="text-xl font-extrabold text-slate-900">12 ms</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between h-36">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">IMPS Rail</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Immediate Transfer</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2 py-0.5 text-[10px] font-bold text-secondary border border-primary/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-online" /> Operational
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-xs text-slate-400">Response time</span>
                  <p className="text-xl font-extrabold text-slate-900">38 ms</p>
                </div>
              </div>

              {/* DYNAMIC HDFC ROUTE CARD */}
              <div className={`rounded-2xl border p-5 flex flex-col justify-between h-36 transition-all ${
                hdfcRoute.status === 'DEGRADED' 
                  ? 'border-amber-200 bg-amber-50/20' 
                  : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">HDFC Nodal Route</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Primary (70% load)</span>
                  </div>
                  {hdfcRoute.status === 'DEGRADED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Degraded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2 py-0.5 text-[10px] font-bold text-secondary border border-primary/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-online" /> Operational
                    </span>
                  )}
                </div>
                <div className="mt-4 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Success Rate</span>
                    <p className={`text-xl font-extrabold ${hdfcRoute.status === 'DEGRADED' ? 'text-amber-600' : 'text-slate-900'}`}>
                      {hdfcRoute.successRate}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Vol: {hdfcRoute.totalTxCount}</span>
                </div>
              </div>

              {/* DYNAMIC ICICI ROUTE CARD */}
              <div className={`rounded-2xl border p-5 flex flex-col justify-between h-36 transition-all ${
                iciciRoute.status === 'DEGRADED' 
                  ? 'border-amber-200 bg-amber-50/20' 
                  : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">ICICI Nodal Route</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Secondary (30% load)</span>
                  </div>
                  {iciciRoute.status === 'DEGRADED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Degraded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2 py-0.5 text-[10px] font-bold text-secondary border border-primary/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-online" /> Operational
                    </span>
                  )}
                </div>
                <div className="mt-4 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Success Rate</span>
                    <p className={`text-xl font-extrabold ${iciciRoute.status === 'DEGRADED' ? 'text-amber-600' : 'text-slate-900'}`}>
                      {iciciRoute.successRate}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Vol: {iciciRoute.totalTxCount}</span>
                </div>
              </div>

            </div>
          </div>

          {/* FINANCIAL HEALTH OVERVIEW (General Ledger) */}
          <LedgerVisualizer 
            pendingBalance={pendingBalance}
            settledBalance={settledBalance}
            payments={payments}
            settlements={settlements}
            platformRevenue={platformRevenue}
            formatCentsToUsd={formatCentsToInr}
          />

          {/* RECENT TRANSACTIONS JOURNAL */}
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Payments Log</h3>
                <p className="text-xs text-slate-500 mt-1">Instant logs showing system captures and routing</p>
              </div>
              <button 
                onClick={() => platform.setActiveTab('payments')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                View full Ledger Journal <ArrowUpRight size={14} />
              </button>
            </div>
            <PaymentsTable 
              payments={payments}
              formatCentsToUsd={formatCentsToInr}
              onRefundClick={role === 'MERCHANT' ? handleRefundClick : undefined}
              limit={5}
            />
          </div>

        </div>
      )}

      {/* 4. PAYMENTS JOURNAL SCREEN */}
      {activeTab === 'payments' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Payment Ledger Journal</h3>
            <p className="text-sm text-slate-500 mt-1">A comprehensive record of all merchant captures, authorizations, and refunds.</p>
          </div>
          <PaymentsTable 
            payments={payments}
            formatCentsToUsd={formatCentsToInr}
          />
        </div>
      )}

      {/* 5. SETTLEMENTS LEDGER SCREEN */}
      {activeTab === 'settlements' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Bank Settlement Batches</h3>
              <p className="text-sm text-slate-500 mt-1">Track payouts sent from the general reserve account directly to merchant bank channels.</p>
            </div>
            {role === 'SUPER_ADMIN' && (
              <button 
                onClick={handleTriggerSettlement}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ArrowRightLeft size={14} /> Trigger Payout Settlement
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Settlement ID</th>
                  <th className="py-4 px-4">Payout Reference</th>
                  <th className="py-4 px-4">Settled Amount</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((sett) => (
                  <tr key={sett.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">{sett.id}</td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">{sett.payoutReference}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">{formatCentsToInr(sett.grossAmount)}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2.5 py-1 text-xs font-bold text-secondary border border-primary/10">
                        <CheckCircle2 size={12} /> {sett.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-400">{new Date(sett.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No bank settlements executed yet. Start by capturing transactions, then click "Trigger Settlements".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. GENERAL LEDGER SCREEN */}
      {activeTab === 'ledger' && (
        <div className="space-y-12">
          <LedgerVisualizer 
            pendingBalance={pendingBalance}
            settledBalance={settledBalance}
            payments={payments}
            settlements={settlements}
            platformRevenue={platformRevenue}
            formatCentsToUsd={formatCentsToInr}
          />
          
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Refund Reversals Log</h3>
              <p className="text-sm text-slate-500 mt-1">History of transaction cancellations, showing partial and full balance debits.</p>
            </div>
            <RefundsTable 
              refunds={refunds}
              formatCentsToInr={formatCentsToInr}
            />
          </div>
        </div>
      )}

      {/* 7. DEVELOPER INTEGRATIONS SCREEN */}
      {activeTab === 'developer' && (
        <div className="space-y-12">
          <ApiKeysManager 
            apiKeys={apiKeys}
            onGenerateKey={platform.handleCreateApiKey}
            onRevokeKey={platform.handleRevokeKey}
          />

          <WebhooksManager 
            webhooks={webhooks}
            onAddWebhookClick={() => platform.setIsWebhookModalOpen(true)}
          />
        </div>
      )}

      {/* 8. RISK & AUDIT TRAILS SCREEN */}
      {activeTab === 'admin' && role === 'SUPER_ADMIN' && (
        <div className="space-y-12">
          <RiskAlertsTable riskAlerts={riskAlerts} />
          <AuditLogsTable auditLogs={auditLogs} />
        </div>
      )}

    </div>
  );
};

export default DashboardContent;
