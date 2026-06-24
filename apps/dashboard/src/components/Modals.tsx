import React from 'react';
import { CreditCard, Shield, Landmark, Sparkles, Send } from 'lucide-react';

// --- ORDER CHECKOUT MODAL ---
interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  setAmount: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  method: string;
  setMethod: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  amount,
  setAmount,
  email,
  setEmail,
  method,
  setMethod,
  onSubmit,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all">
        
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Simulate Checkout Flow</h3>
            <p className="text-[11px] text-slate-500 font-medium">Invokes POST /api/orders and POST /api/payments/capture</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          
          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Order Amount (INR ₹)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold">₹</span>
              <input 
                type="number" 
                step="0.01" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-8 pr-4 text-sm font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <span className="mt-1 block text-[10px] text-slate-400 font-semibold">Amounts &gt;= ₹10,000 trigger High-Value Fraud Risk reviews.</span>
          </div>
          
          {/* Email input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer Email</label>
            <input 
              type="email" 
              placeholder="customer@example.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-sm font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          {/* Payment Method input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method / Network</label>
            <div className="relative">
              <select 
                value={method} 
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-sm font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
              >
                <option value="CARD">Credit/Debit Card (Visa/RuPay)</option>
                <option value="UPI">UPI (BHIM / PhonePe / GPay)</option>
                <option value="NETBANKING">Netbanking (HDFC / ICICI)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Confirm Checkout
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// --- REFUND MODAL ---
interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayment: any;
  amount: string;
  setAmount: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  formatCentsToUsd: (cents: bigint | string) => string;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  selectedPayment,
  amount,
  setAmount,
  onSubmit,
  formatCentsToUsd,
}) => {
  if (!isOpen || !selectedPayment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all">
        
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Initiate Refund Reversal</h3>
            <p className="text-[11px] text-slate-500 font-medium">Performs double-entry ledger reversals (POST /api/refunds)</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Payment ID</label>
            <input 
              type="text" 
              value={selectedPayment.id} 
              disabled 
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 px-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Original Capture Value</label>
            <input 
              type="text" 
              value={formatCentsToUsd(selectedPayment.amount)} 
              disabled 
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 px-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Refund Value (INR ₹)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold">₹</span>
              <input 
                type="number" 
                step="0.01" 
                max={(Number(selectedPayment.amount)/100).toFixed(2)}
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-8 pr-4 text-sm font-semibold text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Confirm Refund Reversal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- WEBHOOK CONFIG MODAL ---
interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  setUrl: (val: string) => void;
  secret: string;
  setSecret: (val: string) => void;
  events: string[];
  setEvents: (val: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({
  isOpen,
  onClose,
  url,
  setUrl,
  secret,
  setSecret,
  events,
  setEvents,
  onSubmit,
}) => {
  if (!isOpen) return null;
  
  const toggleEvent = (evt: string, checked: boolean) => {
    if (checked) {
      setEvents([...events, evt]);
    } else {
      setEvents(events.filter((item) => item !== evt));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all">
        
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Send size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Add Webhook Receiver</h3>
            <p className="text-[11px] text-slate-500 font-medium">Sends cryptographically verified events to your servers</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination URL (HTTP/HTTPS)</label>
            <input 
              type="url" 
              placeholder="https://api.yourmerchant.com/v1/paynexus-receiver"
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-sm font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">HMAC-SHA256 Signing Secret</label>
            <input 
              type="text" 
              value={secret} 
              onChange={(e) => setSecret(e.target.value)} 
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-sm font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trigger Events</label>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
              {['payment.success', 'payment.failed', 'refund.completed', 'settlement.completed'].map((evt) => (
                <label key={evt} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={events.includes(evt)}
                    onChange={(e) => toggleEvent(evt, e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <span>{evt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Configure Endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
