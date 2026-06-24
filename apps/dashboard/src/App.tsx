import React from 'react';
import { usePaymentPlatform } from './hooks/usePaymentPlatform';
import Navbar from './components/Navbar';
import DashboardContent from './components/DashboardContent';
import { OrderModal, RefundModal, WebhookModal } from './components/Modals';

export default function App() {
  const platform = usePaymentPlatform();

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Top sticky Navigation Header */}
      <Navbar 
        role={platform.role}
        setRole={platform.setRole}
        activeTab={platform.activeTab}
        setActiveTab={platform.setActiveTab}
        isBackendConnected={platform.isBackendConnected}
      />

      {/* Main Tab Screen Panel */}
      <DashboardContent platform={platform} />

      {/* Dialog Modals */}
      <OrderModal 
        isOpen={platform.isOrderModalOpen}
        onClose={() => platform.setIsOrderModalOpen(false)}
        amount={platform.newOrderAmount}
        setAmount={platform.setNewOrderAmount}
        email={platform.newOrderEmail}
        setEmail={platform.setNewOrderEmail}
        method={platform.newOrderMethod}
        setMethod={platform.setNewOrderMethod}
        onSubmit={platform.handleCreateAndCapturePayment}
      />

      <RefundModal 
        isOpen={platform.isRefundModalOpen}
        onClose={() => platform.setIsRefundModalOpen(false)}
        selectedPayment={platform.selectedPaymentForRefund}
        amount={platform.refundAmount}
        setAmount={platform.setRefundAmount}
        onSubmit={platform.handleInitiateRefund}
        formatCentsToUsd={platform.formatCentsToInr}
      />

      <WebhookModal 
        isOpen={platform.isWebhookModalOpen}
        onClose={() => platform.setIsWebhookModalOpen(false)}
        url={platform.newWebhookUrl}
        setUrl={platform.setNewWebhookUrl}
        secret={platform.newWebhookSecret}
        setSecret={platform.setNewWebhookSecret}
        events={platform.newWebhookEvents}
        setEvents={platform.setNewWebhookEvents}
        onSubmit={platform.handleAddWebhook}
      />
    </div>
  );
}
