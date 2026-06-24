import React from 'react';
import { ShieldAlert, AlertCircle } from 'lucide-react';

interface RiskAlertsTableProps {
  riskAlerts: any[];
}

export const RiskAlertsTable: React.FC<RiskAlertsTableProps> = ({
  riskAlerts,
}) => {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm shadow-rose-50/20">
      
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert size={18} className="text-rose-500" /> Fraud Rule Engine Flags
        </h3>
        <p className="text-xs text-slate-500">
          Suspicious payments flagged for review or automatically blocked due to velocity, value thresholds, or geographic inconsistencies.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Alert ID</th>
                <th className="py-4 px-4">Flagged Payment</th>
                <th className="py-4 px-4">Triggered Rule</th>
                <th className="py-4 px-4">Fraud Risk Score</th>
                <th className="py-4 px-4">Enforced Action</th>
                <th className="py-4 px-6">Raised At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riskAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-rose-50/10 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">{alert.id}</td>
                  <td className="py-4 px-4 font-mono text-xs text-slate-500">{alert.paymentId}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/50 uppercase tracking-tight">
                      <AlertCircle size={12} /> {alert.ruleTriggered}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-full max-w-[120px]">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>{alert.riskScore}% Risk</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${alert.riskScore >= 70 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                          style={{ width: `${alert.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      alert.actionTaken === 'BLOCK' ? 'badge-failed' : 'badge-pending'
                    }`}>
                      {alert.actionTaken}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-400">
                    {new Date(alert.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {riskAlerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active fraud alerts flagged. Transaction flow is fully compliant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RiskAlertsTable;
