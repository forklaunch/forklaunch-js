import { WorkerEventEntity } from '@forklaunch/interfaces-worker/types';
import { Kafka } from 'kafkajs';
import { KafkaWorkerOptions } from '../types/kafkaWorker.types';

export class KafkaWorkerProducer<
  EventEntity extends WorkerEventEntity,
  Options extends KafkaWorkerOptions
> {
  private producer;

  constructor(
    private readonly queueName: string,
    private readonly options: Options
  ) {
    const kafka = new Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers
    });
    this.producer = kafka.producer();
    this.producer.connect();
  }

  async enqueueJob(event: EventEntity): Promise<void> {
    await this.producer.send({
      topic: this.queueName,
      messages: [{ value: JSON.stringify([event]) }]
    });
  }

  async enqueueBatchJobs(events: EventEntity[]): Promise<void> {
    await this.producer.send({
      topic: this.queueName,
      messages: events.map((event) => ({ value: JSON.stringify(event) }))
    });
  }
}
