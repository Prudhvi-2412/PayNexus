import React from 'react';
import { Plus, Trash2, Key } from 'lucide-react';

interface ApiKeysManagerProps {
  apiKeys: any[];
  onGenerateKey: () => void;
  onRevokeKey: (id: string) => void;
}

export const ApiKeysManager: React.FC<ApiKeysManagerProps> = ({
  apiKeys,
  onGenerateKey,
  onRevokeKey,
}) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Key size={18} className="text-primary" /> Merchant API Keys
          </h3>
          <p className="text-xs text-slate-500">
            Use these keys to authenticate server calls with the `x-api-key` header. Keep them secure.
          </p>
        </div>
        <button
          onClick={onGenerateKey}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus size={14} /> Generate live Key
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Secret Key Prefix</th>
                <th className="py-4 px-4">Created Date</th>
                <th className="py-4 px-4">Expiry Date</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">
                    <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{key.prefix}******************************</span>
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-500">
                    {new Date(key.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      key.active ? 'badge-captured' : 'badge-failed'
                    }`}>
                      {key.active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {key.active ? (
                      <button
                        onClick={() => onRevokeKey(key.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100/80 transition-all cursor-pointer"
                      >
                        <Trash2 size={13} /> Revoke key
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No active API keys found. Click "Generate Live Key" to start.
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

export default ApiKeysManager;
