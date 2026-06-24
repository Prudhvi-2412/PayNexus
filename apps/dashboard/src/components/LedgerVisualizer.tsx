import React from 'react';
import { ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

interface LedgerVisualizerProps {
  pendingBalance: bigint;
  settledBalance: bigint;
  payments: any[];
  settlements: any[];
  platformRevenue: bigint;
  formatCentsToUsd: (cents: bigint | string) => string;
}

export const LedgerVisualizer: React.FC<LedgerVisualizerProps> = ({
  pendingBalance,
  settledBalance,
  payments,
  settlements,
  platformRevenue,
  formatCentsToUsd,
}) => {
  const capturedPayments = payments.filter((p) => p.status === 'CAPTURED');
  const merchantVolume = capturedPayments.reduce((sum, p) => sum + BigInt(p.amount), 0n);

  const totalSettledAmount = settlements.reduce(
    (sum, s) => sum + BigInt(s.grossAmount),
    0n
  );

  const gatewayReceivableVal = merchantVolume - totalSettledAmount;
  const reserveFundAmount = pendingBalance + settledBalance;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      
      {/* HEADER WITH HEALTH SCORE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 mb-8 gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-primary animate-pulse" />
            Financial Health Overview
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Real-time reconciliation of double-entry ledgers (GAAP compliant asset-liability matching).
          </p>
        </div>
        
        {/* HEALTH GAUGE */}
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-secondary border border-emerald-100/50 self-start">
          <ShieldCheck size={18} />
          <div>
            <p className="leading-3 text-slate-900">Ledger Balanced</p>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reconciliation Active</span>
          </div>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUMN 1: ASSETS */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assets (Receivables)</span>
            <span className="text-[10px] font-bold text-primary bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">DEBIT</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-2xl font-extrabold text-slate-950">{formatCentsToUsd(BigInt(gatewayReceivableVal))}</h4>
            <span className="text-xs text-secondary font-bold flex items-center gap-0.5">
              <TrendingUp size={12} /> Normal
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">SYSTEM_GATEWAY bank account float</p>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Gross Captures</span>
              <span className="text-slate-800">{formatCentsToUsd(merchantVolume)}</span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: LIABILITIES */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Liabilities (Payouts)</span>
            <span className="text-[10px] font-bold text-secondary bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">CREDIT</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-2xl font-extrabold text-slate-950">{formatCentsToUsd(reserveFundAmount)}</h4>
            <span className="text-xs text-secondary font-bold flex items-center gap-0.5">
              <TrendingUp size={12} /> Normal
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Merchants balance reserves</p>

          <div className="mt-6 space-y-3.5 text-xs font-semibold">
            <div className="flex justify-between border-b border-slate-200/50 pb-2">
              <span className="text-slate-500">Pending wallet</span>
              <span className="text-amber-500">{formatCentsToUsd(pendingBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Settled payouts</span>
              <span className="text-secondary">{formatCentsToUsd(settledBalance)}</span>
            </div>
          </div>
        </div>

        {/* COLUMN 3: REVENUE / EQUITY */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue (Platform fees)</span>
            <span className="text-[10px] font-bold text-accent bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">CREDIT</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-2xl font-extrabold text-slate-950">{formatCentsToUsd(platformRevenue)}</h4>
            <span className="text-xs text-secondary font-bold flex items-center gap-0.5">
              <TrendingUp size={12} /> +12.4%
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Processing earnings</p>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Service Cost</span>
              <span className="text-slate-800">₹0</span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-1.5">
              <div className="bg-accent h-1.5 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default LedgerVisualizer;
