import React from 'react';
import { Eye, ShieldAlert } from 'lucide-react';

interface AuditLogsTableProps {
  auditLogs: any[];
}

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
  auditLogs,
}) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Eye size={18} className="text-primary" /> Gateway Administrative Audit Trails
        </h3>
        <p className="text-xs text-slate-500">
          Cryptographically signed, un-deletable system logs tracing API key cycles, configuration changes, and ledger settlement events.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Audit ID</th>
                <th className="py-4 px-4">Operator</th>
                <th className="py-4 px-4">Role</th>
                <th className="py-4 px-4">Event Description</th>
                <th className="py-4 px-4">Entity Type</th>
                <th className="py-4 px-4">Resource Identifier</th>
                <th className="py-4 px-6">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  
                  {/* ID */}
                  <td className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">{log.id}</td>
                  
                  {/* OPERATOR */}
                  <td className="py-4 px-4 text-slate-700 font-semibold">{log.actorId}</td>
                  
                  {/* ROLE */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      log.actorRole === 'SYSTEM' ? 'bg-primary/10 text-primary border border-primary/16' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {log.actorRole}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="py-4 px-4 font-medium text-slate-700">{log.action}</td>

                  {/* RESOURCE TYPE */}
                  <td className="py-4 px-4 text-xs text-slate-500 font-semibold">{log.resource}</td>

                  {/* RESOURCE ID */}
                  <td className="py-4 px-4 font-mono text-xs text-slate-400">{log.resourceId}</td>

                  {/* DATE */}
                  <td className="py-4 px-6 text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No gateway audit logs have been written to the ledger database yet.
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

export default AuditLogsTable;
