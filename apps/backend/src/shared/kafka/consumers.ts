import kafkaService from './kafka';
import webhookService from '../../modules/webhook/webhook.service';
import auditService from '../../modules/audit/audit.service';
import redisService from '../redis/redis';

/**
 * Initializes and runs all application-specific Kafka event consumers
 */
export async function startConsumers() {
  const topics = [
    'payment.created',
    'payment.authorized',
    'payment.captured',
    'payment.failed',
    'refund.created',
    'refund.completed',
    'settlement.completed',
  ];

  // 1. WEBHOOK SERVICE CONSUMER GROUP
  // Listens for completed transactions and triggers outbound merchant HTTP webhooks
  await kafkaService.createConsumer('webhook-service-group', topics, async ({ topic, message }) => {
    if (!message.value) return;
    const data = JSON.parse(message.value.toString());
    const merchantId = data.merchantId;

    if (!merchantId) return;

    let webhookEvent = '';
    if (topic === 'payment.captured') webhookEvent = 'payment.success';
    else if (topic === 'payment.failed') webhookEvent = 'payment.failed';
    else if (topic === 'refund.completed') webhookEvent = 'refund.completed';
    else if (topic === 'settlement.completed') webhookEvent = 'settlement.completed';

    if (webhookEvent) {
      console.log(`[Kafka Consumer] Triggering Webhook event: "${webhookEvent}" for merchant ${merchantId}`);
      await webhookService.dispatchEvent(merchantId, webhookEvent, data);
    }
  });

  // 2. AUDIT SERVICE CONSUMER GROUP
  // Records all transactional changes to the postgres audit database log
  await kafkaService.createConsumer('audit-service-group', topics, async ({ topic, message }) => {
    if (!message.value) return;
    const data = JSON.parse(message.value.toString());

    let actorId = data.merchantId || 'SYSTEM';
    let actorRole = data.merchantId ? 'MERCHANT' : 'SYSTEM';
    
    // For payments/refunds/settlements, we map identifiers
    const resourceId = data.paymentId || data.refundId || data.settlementId || data.orderId;
    const resource = topic.split('.')[0]; // order, payment, refund, settlement

    await auditService.log({
      actorId,
      actorRole,
      action: topic,
      resource,
      resourceId,
      afterState: data,
    });
  });

  // 3. ANALYTICS SERVICE CONSUMER GROUP
  // Calculates real-time total transaction values and saves to Redis for dashboard metrics
  await kafkaService.createConsumer('analytics-service-group', topics, async ({ topic, message }) => {
    if (!message.value) return;
    const data = JSON.parse(message.value.toString());

    if (topic === 'payment.captured') {
      const amount = parseInt(data.amount || '0');
      // Increment global processed volume in Redis cache
      const client = redisService.getClient();
      if (client) {
        await client.incrby('analytics:global:volume', amount);
        await client.incr('analytics:global:txcount');
        if (data.merchantId) {
          await client.incrby(`analytics:merchant:${data.merchantId}:volume`, amount);
          await client.incr(`analytics:merchant:${data.merchantId}:txcount`);
        }
      }
    }
  });

  // 4. NOTIFICATION SERVICE CONSUMER GROUP
  // Sends notification simulation logs
  await kafkaService.createConsumer('notification-service-group', topics, async ({ topic, message }) => {
    if (!message.value) return;
    const data = JSON.parse(message.value.toString());

    if (topic === 'payment.captured') {
      console.log(`[Notification Consumer] sending successful payment email alert to customer: ${data.customerEmail || 'default@customer.com'} for amount ${data.amount}`);
    } else if (topic === 'payment.failed') {
      console.log(`[Notification Consumer] sending failed payment alert to merchant: ${data.merchantId}`);
    } else if (topic === 'settlement.completed') {
      console.log(`[Notification Consumer] sending settlement payout completion notice to merchant: ${data.merchantId}`);
    }
  });
}
