import prisma from '../../shared/database/prisma';
import { generateWebhookSignature } from '../../shared/utils/crypto';
import { DeliveryStatus } from '@prisma/client';

const MAX_RETRIES = parseInt(process.env.WEBHOOK_DEFAULT_RETRY_LIMIT || '5');
const RETRY_INTERVAL_MINUTES = parseInt(process.env.WEBHOOK_DEFAULT_RETRY_INTERVAL_MINUTES || '5');

export class WebhookService {
  /**
   * Dispatches a webhook event to a merchant
   */
  public async dispatchEvent(merchantId: string, eventType: string, eventPayload: any) {
    // 1. Fetch active webhooks for this merchant
    const webhooks = await prisma.merchantWebhook.findMany({
      where: {
        merchantId,
        active: true,
      },
    });

    for (const webhook of webhooks) {
      // Check if this webhook subscribes to this event
      const subscribedEvents = webhook.events.split(',').map((e) => e.trim());
      if (!subscribedEvents.includes(eventType) && !subscribedEvents.includes('*')) {
        continue;
      }

      // Prepare payload wrapper
      const payloadWrapper = {
        id: 'evt_' + Math.random().toString(36).substring(2, 15),
        event: eventType,
        created: new Date().toISOString(),
        data: eventPayload,
      };

      const payloadString = JSON.stringify(payloadWrapper);
      const signature = generateWebhookSignature(payloadString, webhook.secret);

      // Create Webhook log
      const log = await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          eventType,
          payload: payloadString,
          deliveryStatus: DeliveryStatus.FAILED, // Default to failed until successful
          retryCount: 0,
        },
      });

      // Deliver asynchronously
      this.executeDelivery(webhook.url, payloadString, signature, log.id);
    }
  }

  /**
   * Performs the HTTP request to merchant's URL
   */
  private async executeDelivery(
    url: string,
    payload: string,
    signature: string,
    logId: string,
    currentRetryCount: number = 0
  ) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'PaymentPlatform-Webhook-Engine/1.0',
        },
        body: payload,
        signal: AbortSignal.timeout(5000), // 5 seconds timeout
      });

      const responseText = await response.text();
      const responseStatus = response.status;
      const isSuccess = responseStatus >= 200 && responseStatus < 300;

      if (isSuccess) {
        await prisma.webhookLog.update({
          where: { id: logId },
          data: {
            deliveryStatus: DeliveryStatus.SUCCESS,
            responseStatus,
            responseBody: responseText.substring(0, 1000), // Truncate logs if too long
          },
        });
        console.log(`Webhook delivery succeeded for log ${logId}. URL: ${url}`);
      } else {
        await this.handleFailure(logId, responseStatus, responseText, currentRetryCount);
      }
    } catch (error: any) {
      console.warn(`Webhook connection failed for log ${logId}. URL: ${url}. Error:`, error.message);
      await this.handleFailure(logId, 0, error.message || 'Timeout / Connection Error', currentRetryCount);
    }
  }

  /**
   * Manages delivery retries and backoff math
   */
  private async handleFailure(logId: string, status: number, responseBody: string, currentRetryCount: number) {
    const nextRetryCount = currentRetryCount + 1;
    const isRetryAvailable = nextRetryCount <= MAX_RETRIES;

    if (isRetryAvailable) {
      // Exponential backoff: retry interval * 2^retry_count
      const backoffMinutes = RETRY_INTERVAL_MINUTES * Math.pow(2, currentRetryCount);
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          deliveryStatus: DeliveryStatus.FAILED,
          responseStatus: status || null,
          responseBody: responseBody.substring(0, 1000),
          retryCount: nextRetryCount,
          nextRetryAt,
        },
      });

      console.log(`Webhook log ${logId} failed. Scheduled retry #${nextRetryCount} at ${nextRetryAt.toISOString()}`);
    } else {
      // Max retries reached, fail permanently
      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          deliveryStatus: DeliveryStatus.FAILED,
          responseStatus: status || null,
          responseBody: responseBody.substring(0, 1000),
          nextRetryAt: null, // No more retries
        },
      });
      console.error(`Webhook log ${logId} failed completely after ${MAX_RETRIES} retries.`);
    }
  }

  /**
   * Cron/Interval worker to retry pending logs
   */
  public async processRetryQueue() {
    const now = new Date();
    
    // Find all failed webhook logs that are due for a retry
    const pendingRetries = await prisma.webhookLog.findMany({
      where: {
        deliveryStatus: DeliveryStatus.FAILED,
        retryCount: { lt: MAX_RETRIES },
        nextRetryAt: { lte: now },
      },
      include: {
        webhook: true,
      },
    });

    if (pendingRetries.length === 0) return;

    console.log(`Processing Webhook retry queue. Found ${pendingRetries.length} logs to retry.`);

    for (const log of pendingRetries) {
      const signature = generateWebhookSignature(log.payload, log.webhook.secret);
      // Run retry delivery
      this.executeDelivery(log.webhook.url, log.payload, signature, log.id, log.retryCount);
    }
  }
}

export const webhookService = new WebhookService();
export default webhookService;
