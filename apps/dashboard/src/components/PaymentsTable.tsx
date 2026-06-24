import React from 'react';
import { Shield, CreditCard, Landmark, Compass, ArrowUpRight } from 'lucide-react';

interface PaymentsTableProps {
  payments: any[];
  formatCentsToUsd: (cents: bigint | string) => string;
  onRefundClick?: (payment: any) => void;
  limit?: number;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  payments,
  formatCentsToUsd,
  onRefundClick,
  limit,
}) => {
  const displayPayments = limit ? payments.slice(0, limit) : payments;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CARD':
        return <CreditCard size={14} className="text-slate-400" />;
      case 'NETBANKING':
        return <Landmark size={14} className="text-slate-400" />;
      default:
        return <Compass size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6">Payment ID</th>
              <th className="py-4 px-4">Customer Email</th>
              <th className="py-4 px-4">Channel</th>
              <th className="py-4 px-4">Fraud Check</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-right">Amount</th>
              <th className="py-4 px-4">Captured At</th>
              {onRefundClick && <th className="py-4 px-6 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayPayments.map((pay) => (
              <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                
                {/* ID */}
                <td className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">
                  {pay.id}
                </td>

                {/* CUSTOMER */}
                <td className="py-4 px-4 text-slate-600 font-medium">
                  {pay.customerEmail || 'customer@test.com'}
                </td>

                {/* METHOD */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    {getMethodIcon(pay.method)}
                    <span>{pay.method}</span>
                  </div>
                </td>

                {/* FRAUD RISK */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className={
                      pay.riskScore >= 75 ? 'text-rose-500' : pay.riskScore >= 40 ? 'text-amber-500' : 'text-emerald-500'
                    } />
                    <span className={`text-xs font-bold ${
                      pay.riskScore >= 75 ? 'text-rose-600' : pay.riskScore >= 40 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {pay.riskScore}% ({pay.riskStatus})
                    </span>
                  </div>
                </td>

                {/* STATUS BADGE */}
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    pay.status === 'CAPTURED' ? 'badge-captured' :
                    pay.status === 'AUTHORIZED' ? 'badge-pending' :
                    pay.status === 'REFUNDED' ? 'badge-refunded' : 'badge-failed'
                  }`}>
                    {pay.status}
                  </span>
                </td>

                {/* AMOUNT */}
                <td className="py-4 px-4 text-right font-extrabold text-slate-950">
                  {formatCentsToUsd(pay.amount)}
                </td>

                {/* DATE */}
                <td className="py-4 px-4 text-xs text-slate-400">
                  {new Date(pay.createdAt).toLocaleTimeString()}
                </td>

                {/* REFUND TRIGGER */}
                {onRefundClick && (
                  <td className="py-4 px-6 text-right">
                    {pay.status === 'CAPTURED' ? (
                      <button
                        onClick={() => onRefundClick(pay)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100/80 transition-all cursor-pointer"
                      >
                        Refund <ArrowUpRight size={13} />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">Reconciled</span>
                    )}
                  </td>
                )}

              </tr>
            ))}
            {displayPayments.length === 0 && (
              <tr>
                <td colSpan={onRefundClick ? 8 : 7} className="py-8 text-center text-slate-400">
                  No payment ledger records recorded in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsTable;
