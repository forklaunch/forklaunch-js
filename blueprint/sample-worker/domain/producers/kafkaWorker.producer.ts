import { Kafka } from 'kafkajs';
import { SampleWorkerEvent } from '../../persistence/entities';
import { SampleWorkerProducer } from '../interfaces/sampleWorkerProducer.interface';
import { KafkaWorkerOptions } from '../types/kafkaWorker.types';

export class KafkaWorkerProducer implements SampleWorkerProducer {
  private producer;

  constructor(
    private readonly queueName: string,
    private readonly options: KafkaWorkerOptions
  ) {
    const kafka = new Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers
    });
    this.producer = kafka.producer();
    this.producer.connect();
  }

  async enqueueJob(event: SampleWorkerEvent): Promise<void> {
    await this.producer.send({
      topic: this.queueName,
      messages: [{ value: JSON.stringify([event]) }]
    });
  }

  async enqueueBatchJobs(events: SampleWorkerEvent[]): Promise<void> {
    await this.producer.send({
      topic: this.queueName,
      messages: events.map((event) => ({ value: JSON.stringify(event) }))
    });
  }
}
