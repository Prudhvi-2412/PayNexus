import React from 'react';
import { Plus, Radio } from 'lucide-react';

interface WebhooksManagerProps {
  webhooks: any[];
  onAddWebhookClick: () => void;
}

export const WebhooksManager: React.FC<WebhooksManagerProps> = ({
  webhooks,
  onAddWebhookClick,
}) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Radio size={18} className="text-primary" /> Webhook Endpoints
          </h3>
          <p className="text-xs text-slate-500">
            Configure URL endpoints to listen for live events (payment.success, refund.completed) signed using HMAC-SHA256.
          </p>
        </div>
        <button
          onClick={onAddWebhookClick}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus size={14} /> Add Endpoint
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Endpoint URL</th>
                <th className="py-4 px-4">Subscribed Events</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-primary font-bold">
                    {wh.url}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {wh.events.map((e: string) => (
                        <span
                          key={e}
                          className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200/50 uppercase tracking-tight"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success border border-success/16">
                      <span className="h-1.5 w-1.5 rounded-full bg-success pulse-online" /> Active
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {webhooks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No webhooks registered. Click "Add Endpoint" to create one.
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

export default WebhooksManager;
