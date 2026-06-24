import React from 'react';
import { DollarSign, Percent, AlertTriangle, Users, Landmark, Coins, TrendingUp } from 'lucide-react';

interface MetricCardsProps {
  role: 'MERCHANT' | 'SUPER_ADMIN';
  settledBalance: bigint;
  pendingBalance: bigint;
  payments: any[];
  riskAlerts: any[];
  platformRevenue: bigint;
  formatCentsToUsd: (cents: bigint | string) => string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  role,
  settledBalance,
  pendingBalance,
  payments,
  riskAlerts,
  platformRevenue,
  formatCentsToUsd,
}) => {
  const globalVolume = payments
    .filter((p) => p.status === 'CAPTURED')
    .reduce((sum, p) => sum + BigInt(p.amount), 0n);

  const reviewQueueCount = riskAlerts.filter((a) => a.actionTaken === 'REVIEW').length;
  
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      
      {/* CARD 1: TOTAL VOLUME */}
      <div className="fintech-card p-6 min-h-[160px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Volume</span>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-secondary border border-emerald-100">
            <Coins size={22} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCentsToUsd(globalVolume)}
          </h3>
          <p className="mt-2 flex items-center gap-1 text-xs text-secondary font-bold">
            <TrendingUp size={14} />
            <span>+18.4%</span>
            <span className="text-slate-400 font-medium">vs last week</span>
          </p>
        </div>
      </div>

      {/* CARD 2: PLATFORM REVENUE */}
      <div className="fintech-card p-6 min-h-[160px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Fee</span>
          <div className="rounded-xl bg-teal-50 p-2.5 text-accent border border-teal-100">
            <DollarSign size={22} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCentsToUsd(platformRevenue)}
          </h3>
          <p className="mt-2 flex items-center gap-1 text-xs text-secondary font-bold">
            <TrendingUp size={14} />
            <span>+12.1%</span>
            <span className="text-slate-400 font-medium">net share</span>
          </p>
        </div>
      </div>

      {/* CARD 3: SETTLEMENT BUFFER */}
      <div className="fintech-card p-6 min-h-[160px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reserve Balance</span>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-secondary border border-emerald-100">
            <Landmark size={22} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCentsToUsd(pendingBalance)}
          </h3>
          <p className="mt-2 text-xs text-slate-400 font-medium">Pending auto-payout</p>
        </div>
      </div>

      {/* CARD 4: SETTLEMENT SUCCESS RATE */}
      <div className="fintech-card p-6 min-h-[160px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settlement Success</span>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-secondary border border-emerald-100">
            <Percent size={22} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">99.85%</h3>
          <p className="mt-2 text-xs text-secondary font-bold uppercase tracking-wider">Rails: Live</p>
        </div>
      </div>

      {/* CARD 5: RISK REVIEW ALERT COUNT */}
      <div className="fintech-card p-6 min-h-[160px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Reviews</span>
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-500 border border-rose-100">
            <AlertTriangle size={22} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{reviewQueueCount}</h3>
          <p className="mt-2 text-xs text-slate-400 font-medium">Active rule flags</p>
        </div>
      </div>

      {/* CARD 6: TRANSACTION COUNT */}
      <div className="fintech-card p-6 min-h-[160px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
          <div className="rounded-xl bg-teal-50 p-2.5 text-accent border border-teal-100">
            <Users size={22} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{payments.length}</h3>
          <p className="mt-2 text-xs text-secondary font-bold">Today's metrics</p>
        </div>
      </div>

    </div>
  );
};

export default MetricCards;
