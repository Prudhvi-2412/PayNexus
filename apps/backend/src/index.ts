import dotenv from 'dotenv';
// Load environment variables before importing services
dotenv.config();

import app from './app';
import { startConsumers } from './shared/kafka/consumers';
import webhookService from './modules/webhook/webhook.service';
import kafkaService from './shared/kafka/kafka';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    console.log('Bootstrapping payment platform services...');

    // Start Kafka consumers in the background
    startConsumers().catch((err) => {
      console.error('Failed to start Kafka Consumers:', err);
    });

    // Webhook Retry Loop (runs every 30 seconds to simulate webhook cron scheduler)
    const webhookInterval = setInterval(async () => {
      try {
        await webhookService.processRetryQueue();
      } catch (err) {
        console.error('Error during webhook retry queue run:', err);
      }
    }, 30000);

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`Payment Gateway Monolith running on port ${PORT}`);
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('Initiating graceful shutdown...');
      clearInterval(webhookInterval);
      
      // Close server first to stop accepting new requests
      server.close(() => {
        console.log('HTTP server closed.');
      });

      // Disconnect Kafka connections
      await kafkaService.disconnectAll();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Bootstrap failure:', error);
    process.exit(1);
  }
}

bootstrap();
