import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface RefundsTableProps {
  refunds: any[];
  formatCentsToUsd: (cents: bigint | string) => string;
}

export const RefundsTable: React.FC<RefundsTableProps> = ({
  refunds,
  formatCentsToUsd,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6">Refund ID</th>
              <th className="py-4 px-4">Payment ID</th>
              <th className="py-4 px-4">Reason / Notes</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-right">Reversed Amount</th>
              <th className="py-4 px-4">Processed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {refunds.map((ref) => (
              <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">{ref.id}</td>
                <td className="py-4 px-4 font-mono text-xs text-slate-400">{ref.paymentId}</td>
                <td className="py-4 px-4 font-medium text-slate-600">{ref.reason}</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/16">
                    <ArrowLeftRight size={12} /> Reversal SUCCESS
                  </span>
                </td>
                <td className="py-4 px-4 text-right font-extrabold text-rose-600">
                  -{formatCentsToUsd(ref.amount)}
                </td>
                <td className="py-4 px-4 text-xs text-slate-400">
                  {new Date(ref.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {refunds.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No transaction refunds have been logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RefundsTable;
