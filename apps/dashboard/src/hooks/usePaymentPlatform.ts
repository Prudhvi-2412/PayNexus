import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api/v1';

const INITIAL_MOCK_PAYMENTS = [
  { id: 'pay_901', orderId: 'ord_901', amount: '12000', currency: 'USD', status: 'CAPTURED', method: 'CARD', gatewayReference: 'GWT_CAPT_SEED901', riskScore: 12, riskStatus: 'ALLOW', createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
  { id: 'pay_902', orderId: 'ord_902', amount: '5000', currency: 'USD', status: 'CAPTURED', method: 'UPI', gatewayReference: 'GWT_CAPT_SEED902', riskScore: 5, riskStatus: 'ALLOW', createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
  { id: 'pay_903', orderId: 'ord_903', amount: '40000', currency: 'USD', status: 'AUTHORIZED', method: 'CARD', gatewayReference: 'GWT_AUTH_SEED903', riskScore: 48, riskStatus: 'REVIEW', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  { id: 'pay_904', orderId: 'ord_904', amount: '9000', currency: 'USD', status: 'FAILED', method: 'CARD', gatewayReference: 'GWT_FAIL_SEED904', riskScore: 82, riskStatus: 'BLOCK', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
];

const INITIAL_MOCK_REFUNDS = [
  { id: 'ref_001', paymentId: 'pay_901', amount: '2000', currency: 'USD', status: 'SUCCESS', reason: 'Customer return', createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() }
];

const INITIAL_MOCK_KEYS = [
  { id: 'key_1', prefix: 'sk_live_abc123', active: true, expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(), createdAt: new Date().toISOString() }
];

const INITIAL_MOCK_WEBHOOKS = [
  { id: 'wh_1', url: 'https://api.merchant.com/v1/webhooks', events: ['payment.success', 'refund.completed'], active: true }
];

const INITIAL_MOCK_ALERTS = [
  { id: 'alert_1', paymentId: 'pay_904', ruleTriggered: 'HIGH_RISK_SCORE', riskScore: 82, actionTaken: 'BLOCK', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  { id: 'alert_2', paymentId: 'pay_903', ruleTriggered: 'IP_VELOCITY_HIGH', riskScore: 48, actionTaken: 'REVIEW', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() }
];

const INITIAL_MOCK_AUDIT = [
  { id: 'aud_1', actorId: 'merchant_123', actorRole: 'MERCHANT', action: 'api_key.created', resource: 'api_key', resourceId: 'sk_live_abc123', createdAt: new Date().toISOString() },
  { id: 'aud_2', actorId: 'SYSTEM', actorRole: 'SYSTEM', action: 'settlement.completed', resource: 'settlement', resourceId: 'set_batch_01', createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString() }
];

export function usePaymentPlatform() {
  const [role, setRole] = useState<'MERCHANT' | 'SUPER_ADMIN'>('MERCHANT');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Platform Lists
  const [payments, setPayments] = useState<any[]>(INITIAL_MOCK_PAYMENTS);
  const [refunds, setRefunds] = useState<any[]>(INITIAL_MOCK_REFUNDS);
  const [apiKeys, setApiKeys] = useState<any[]>(INITIAL_MOCK_KEYS);
  const [webhooks, setWebhooks] = useState<any[]>(INITIAL_MOCK_WEBHOOKS);
  const [riskAlerts, setRiskAlerts] = useState<any[]>(INITIAL_MOCK_ALERTS);
  const [auditLogs, setAuditLogs] = useState<any[]>(INITIAL_MOCK_AUDIT);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [gatewayRoutes, setGatewayRoutes] = useState<any[]>([]);
  
  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  
  // Form Inputs
  const [newOrderAmount, setNewOrderAmount] = useState('100.00');
  const [newOrderEmail, setNewOrderEmail] = useState('customer@example.com');
  const [newOrderMethod, setNewOrderMethod] = useState('CARD');
  
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('whsec_merchant_secret_123');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['payment.success']);

  // Dynamic ledger states
  const [pendingBalance, setPendingBalance] = useState(14870n);
  const [settledBalance, setSettledBalance] = useState(0n);
  const [platformRevenue, setPlatformRevenue] = useState(400n);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => {
        if (res.ok) {
          setIsBackendConnected(true);
        }
      })
      .catch(() => {
        setIsBackendConnected(false);
      });
  }, [role]);

  // Poll Routing Stats from backend
  useEffect(() => {
    if (isBackendConnected) {
      const fetchRoutes = async () => {
        try {
          const res = await fetch(`${API_BASE}/payments/routing-stats`);
          if (res.ok) {
            const data = await res.json();
            setGatewayRoutes(data);
          }
        } catch (err) {
          console.warn('Failed to fetch gateway routing stats:', err);
        }
      };
      fetchRoutes();
      const interval = setInterval(fetchRoutes, 4000);
      return () => clearInterval(interval);
    }
  }, [isBackendConnected]);

  // Load database values if backend is connected
  useEffect(() => {
    if (!isBackendConnected) return;

    const fetchDatabaseState = async () => {
      const headers = { 'x-api-key': 'sk_live_abc123merchantkeyforlocaldemo' };
      try {
        // 1. Fetch balance
        const balanceRes = await fetch(`${API_BASE}/v1/balance`, { headers });
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          if (balanceData) {
            setPendingBalance(BigInt(balanceData.pendingBalance || 0));
            setSettledBalance(BigInt(balanceData.settledBalance || 0));
          }
        }

        // 2. Fetch payments
        const paymentsRes = await fetch(`${API_BASE}/v1/payments`, { headers });
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData);
        }

        // 3. Fetch refunds
        const refundsRes = await fetch(`${API_BASE}/v1/refunds`, { headers });
        if (refundsRes.ok) {
          const refundsData = await refundsRes.json();
          setRefunds(refundsData);
        }

        // 4. Fetch admin stats
        const adminStatsRes = await fetch(`${API_BASE}/payments/admin-stats`);
        if (adminStatsRes.ok) {
          const adminData = await adminStatsRes.json();
          if (adminData) {
            setPlatformRevenue(BigInt(adminData.platformRevenue || 0));
            setSettlements(adminData.settlements || []);
            setRiskAlerts(adminData.riskAlerts || []);
            setAuditLogs(adminData.auditLogs || []);
          }
        }
      } catch (err) {
        console.warn('Failed to sync frontend lists with backend database:', err);
      }
    };

    fetchDatabaseState();
    const interval = setInterval(fetchDatabaseState, 4000);
    return () => clearInterval(interval);
  }, [isBackendConnected]);

  const formatCentsToInr = (cents: bigint | string) => {
    const val = typeof cents === 'bigint' ? cents : BigInt(cents);
    const rupees = Number(val) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(rupees).replace('INR', '₹').replace(/\s+/g, '');
  };

  const formatCompactInr = (cents: bigint | string) => {
    const val = typeof cents === 'bigint' ? cents : BigInt(cents);
    const rupees = Number(val) / 100;
    if (rupees >= 10000000) {
      return `₹${(rupees / 10000000).toFixed(2)} Cr`;
    }
    if (rupees >= 100000) {
      return `₹${(rupees / 100000).toFixed(2)} Lakh`;
    }
    return formatCentsToInr(cents);
  };

  const handleTriggerSettlement = async () => {
    if (isBackendConnected) {
      try {
        const response = await fetch(`${API_BASE}/settlements/trigger`, { method: 'POST' });
        if (response.ok) {
          alert('Settlement batch completed successfully on the backend!');
        } else {
          const err = await response.json();
          alert('Settlement failed: ' + err.error);
        }
      } catch (err: any) {
        alert('Network error: ' + err.message);
      }
    } else {
      if (pendingBalance <= 0n) {
        alert('No pending balances available to settle!');
        return;
      }
      const grossToSettle = pendingBalance;
      const payoutRef = 'PAYOUT_NET_' + Math.random().toString(36).substring(7).toUpperCase();

      const newSettlement = {
        id: 'sett_' + Math.random().toString(36).substring(5),
        merchantId: 'merchant_123',
        grossAmount: grossToSettle.toString(),
        feeAmount: '0',
        netAmount: grossToSettle.toString(),
        status: 'SUCCEEDED',
        payoutReference: payoutRef,
        createdAt: new Date().toISOString()
      };

      setSettlements([newSettlement, ...settlements]);
      setSettledBalance(settledBalance + grossToSettle);
      setPendingBalance(0n);

      setAuditLogs([
        {
          id: 'aud_' + Date.now(),
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'settlement.completed',
          resource: 'settlement',
          resourceId: newSettlement.id,
          createdAt: new Date().toISOString()
        },
        ...auditLogs
      ]);

      alert(`Simulated settlement succeeded! Moved ${formatCentsToInr(grossToSettle)} to settled payouts.`);
    }
  };

  const handleCreateAndCapturePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountInCents = BigInt(Math.round(parseFloat(newOrderAmount) * 100));

    if (amountInCents <= 0n) {
      alert('Amount must be positive');
      return;
    }

    if (isBackendConnected) {
      try {
        const orderRes = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'sk_live_abc123merchantkeyforlocaldemo' },
          body: JSON.stringify({
            merchantOrderId: 'ord_' + Math.random().toString(36).substring(2, 9),
            amount: amountInCents.toString(),
            currency: 'USD',
            customerEmail: newOrderEmail
          })
        });
        if (!orderRes.ok) return alert('Order creation failed');
        
        const order = await orderRes.json();
        const captureRes = await fetch(`${API_BASE}/payments/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, method: newOrderMethod })
        });

        if (captureRes.ok) {
          alert('Payment captured!');
          setIsOrderModalOpen(false);
        } else {
          const captureErr = await captureRes.json();
          alert('Capture failed: ' + (captureErr.error || 'Unknown error'));
        }
      } catch (err: any) {
        alert('API error: ' + err.message);
      }
    } else {
      let score = 5;
      let action = 'ALLOW';
      const rules = [];

      if (amountInCents >= 1000000n) {
        score += 45;
        rules.push('HIGH_VALUE_TRANSACTION');
      }
      if (score >= 40) action = 'REVIEW';

      const orderId = 'ord_' + Math.random().toString(36).substring(4);
      const paymentId = 'pay_' + Math.random().toString(36).substring(4);

      const newPayment = {
        id: paymentId,
        orderId,
        amount: amountInCents.toString(),
        currency: 'USD',
        status: 'CAPTURED',
        method: newOrderMethod,
        gatewayReference: 'GWT_CAPT_' + Math.random().toString(36).substring(5).toUpperCase(),
        riskScore: score,
        riskStatus: action,
        createdAt: new Date().toISOString()
      };

      setPayments([newPayment, ...payments]);

      const fee = (amountInCents * 2n) / 100n + 30n;
      const net = amountInCents - fee;

      setPendingBalance(pendingBalance + net);
      setPlatformRevenue(platformRevenue + fee);

      if (action === 'REVIEW') {
        setRiskAlerts([
          {
            id: 'alert_' + Date.now(),
            paymentId,
            ruleTriggered: rules.join(', '),
            riskScore: score,
            actionTaken: 'REVIEW',
            createdAt: new Date().toISOString()
          },
          ...riskAlerts
        ]);
      }

      setAuditLogs([
        {
          id: 'aud_' + Date.now(),
          actorId: 'merchant_123',
          actorRole: 'MERCHANT',
          action: 'payment.captured',
          resource: 'payment',
          resourceId: paymentId,
          createdAt: new Date().toISOString()
        },
        ...auditLogs
      ]);

      alert(`Simulated payment captured! Net credited: ${formatCentsToInr(net)}`);
      setIsOrderModalOpen(false);
    }
  };

  const handleInitiateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const refundCents = BigInt(Math.round(parseFloat(refundAmount) * 100));

    if (!selectedPaymentForRefund || refundCents <= 0n) return;

    if (isBackendConnected) {
      try {
        const response = await fetch(`${API_BASE}/refunds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'sk_live_abc123merchantkeyforlocaldemo' },
          body: JSON.stringify({
            paymentId: selectedPaymentForRefund.id,
            amount: refundCents.toString(),
            reason: 'Merchant requested refund'
          })
        });
        if (response.ok) {
          alert('Refund processed!');
          setIsRefundModalOpen(false);
        } else {
          const err = await response.json();
          alert('Refund failed: ' + err.error);
        }
      } catch (err: any) {
        alert('Refund error: ' + err.message);
      }
    } else {
      const paymentAmount = BigInt(selectedPaymentForRefund.amount);
      if (refundCents > paymentAmount) return alert('Refund exceeds payment amount');

      const newRefund = {
        id: 'ref_' + Math.random().toString(36).substring(4),
        paymentId: selectedPaymentForRefund.id,
        amount: refundCents.toString(),
        currency: 'USD',
        status: 'SUCCESS',
        reason: 'Merchant console refund',
        createdAt: new Date().toISOString()
      };

      setRefunds([newRefund, ...refunds]);

      const originalFee = (paymentAmount * 2n) / 100n + 30n;
      const feeReversal = (refundCents * originalFee) / paymentAmount;
      const netReversal = refundCents - feeReversal;

      setPendingBalance(pendingBalance - netReversal);
      setPlatformRevenue(platformRevenue - feeReversal);

      setPayments(
        payments.map((p) => (p.id === selectedPaymentForRefund.id ? { ...p, status: 'REFUNDED' } : p))
      );

      setAuditLogs([
        {
          id: 'aud_' + Date.now(),
          actorId: 'merchant_123',
          actorRole: 'MERCHANT',
          action: 'refund.completed',
          resource: 'refund',
          resourceId: newRefund.id,
          createdAt: new Date().toISOString()
        },
        ...auditLogs
      ]);

      alert(`Simulated refund completed.`);
      setIsRefundModalOpen(false);
    }
  };

  const handleCreateApiKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const newKey = {
      id: 'key_' + Date.now(),
      prefix: `sk_live_${randomHex}`,
      active: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    setApiKeys([...apiKeys, newKey]);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, active: false } : k)));
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;

    const newWh = {
      id: 'wh_' + Date.now(),
      url: newWebhookUrl,
      events: newWebhookEvents,
      active: true
    };

    setWebhooks([...webhooks, newWh]);
    setNewWebhookUrl('');
    setIsWebhookModalOpen(false);
    alert('Webhook endpoint registered.');
  };

  const handleRefundClick = (pay: any) => {
    setSelectedPaymentForRefund(pay);
    setRefundAmount((Number(pay.amount) / 100).toFixed(2));
    setIsRefundModalOpen(true);
  };

  return {
    role, setRole,
    isBackendConnected,
    activeTab, setActiveTab,
    payments,
    refunds,
    apiKeys,
    webhooks,
    riskAlerts,
    auditLogs,
    settlements,
    gatewayRoutes,
    isOrderModalOpen, setIsOrderModalOpen,
    isRefundModalOpen, setIsRefundModalOpen,
    isWebhookModalOpen, setIsWebhookModalOpen,
    newOrderAmount, setNewOrderAmount,
    newOrderEmail, setNewOrderEmail,
    newOrderMethod, setNewOrderMethod,
    selectedPaymentForRefund,
    refundAmount, setRefundAmount,
    newWebhookUrl, setNewWebhookUrl,
    newWebhookSecret, setNewWebhookSecret,
    newWebhookEvents, setNewWebhookEvents,
    pendingBalance,
    settledBalance,
    platformRevenue,
    formatCentsToInr,
    formatCompactInr,
    handleTriggerSettlement,
    handleCreateAndCapturePayment,
    handleInitiateRefund,
    handleCreateApiKey,
    handleRevokeKey,
    handleAddWebhook,
    handleRefundClick,
  };
}
