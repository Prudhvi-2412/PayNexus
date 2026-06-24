import { Kafka, Producer, Consumer, EachMessageHandler } from 'kafkajs';

const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

class KafkaService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isProducerConnected = false;
  private consumers: Consumer[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.kafka = new Kafka({
        clientId: 'payment-platform',
        brokers: kafkaBrokers,
        retry: {
          initialRetryTime: 100,
          retries: 3,
        },
      });
      this.producer = this.kafka.producer();
      this.connectProducer();
    } catch (err) {
      console.warn('Failed to initialize Kafka client:', err);
    }
  }

  private async connectProducer() {
    if (!this.producer) return;
    try {
      await this.producer.connect();
      console.log('Kafka Producer connected successfully.');
      this.isProducerConnected = true;
    } catch (err) {
      console.warn('Kafka Producer failed to connect. Events will not be published.', err);
      this.isProducerConnected = false;
    }
  }

  public async publish(topic: string, message: object): Promise<void> {
    if (!this.isProducerConnected || !this.producer) {
      console.warn(`Kafka not connected. Skipping publish for topic "${topic}":`, JSON.stringify(message));
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify({
              ...message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
    } catch (err) {
      console.error(`Failed to publish event to topic ${topic}:`, err);
    }
  }

  public async createConsumer(groupId: string, topics: string[], onMessage: EachMessageHandler): Promise<Consumer | null> {
    if (!this.kafka) {
      console.warn('Kafka client not initialized. Cannot create consumer.');
      return null;
    }

    try {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();
      
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }

      await consumer.run({
        eachMessage: onMessage,
      });

      this.consumers.push(consumer);
      console.log(`Kafka Consumer registered for topics [${topics.join(', ')}] with group ID "${groupId}"`);
      return consumer;
    } catch (err) {
      console.error(`Failed to create consumer for group ${groupId}:`, err);
      return null;
    }
  }

  public async disconnectAll(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    console.log('All Kafka connections closed.');
  }
}

export const kafkaService = new KafkaService();
export default kafkaService;
