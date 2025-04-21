import { WorkerConsumer } from '@forklaunch/interfaces-worker/interfaces';
import {
  WorkerEventEntity,
  WorkerFailureHandler,
  WorkerProcessFunction
} from '@forklaunch/interfaces-worker/types';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { WorkerOptions } from '../types/kafkaWorker.types';

export class KafkaWorkerConsumer<
  EventEntity extends WorkerEventEntity,
  Options extends WorkerOptions
> implements WorkerConsumer<EventEntity>
{
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private processedMessages: Set<string> = new Set();

  constructor(
    protected readonly queueName: string,
    protected readonly options: Options,
    protected readonly processEventsFunction: WorkerProcessFunction<EventEntity>,
    protected readonly failureHandler: WorkerFailureHandler<EventEntity>
  ) {
    this.kafka = new Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: this.options.groupId
    });
  }

  private async setupConsumer() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.queueName,
      fromBeginning: false
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        const messageKey = `${topic}-${partition}-${message.offset}`;

        if (this.processedMessages.has(messageKey)) {
          return;
        }

        const events = JSON.parse(message.value.toString()) as EventEntity[];

        try {
          await this.processEventsFunction(events);
          this.processedMessages.add(messageKey);

          await this.consumer.commitOffsets([
            {
              topic,
              partition,
              offset: (parseInt(message.offset) + 1).toString()
            }
          ]);
        } catch (error) {
          this.failureHandler([
            {
              value: events[0],
              error: error as Error
            }
          ]);
          for (const event of events) {
            if (event.retryCount <= this.options.retries) {
              await this.producer.send({
                topic: this.queueName,
                messages: [
                  {
                    value: JSON.stringify([
                      {
                        ...event,
                        retryCount: event.retryCount + 1
                      }
                    ]),
                    key: event.id
                  }
                ]
              });
            }
          }
        }
      }
    });
  }

  async peekEvents(): Promise<EventEntity[]> {
    const events: EventEntity[] = [];

    const admin = this.kafka.admin();
    await admin.connect();

    try {
      // Get topic metadata to find partitions
      const metadata = await admin.fetchTopicMetadata({
        topics: [this.queueName]
      });
      const topic = metadata.topics[0];

      if (!topic) {
        return events;
      }

      // For each partition, get the latest offset
      for (const partition of topic.partitions) {
        const offsets = await admin.fetchTopicOffsets(this.queueName);
        const partitionOffset = offsets.find(
          (o) => o.partition === partition.partitionId
        );

        if (!partitionOffset) {
          continue;
        }

        // Create a temporary consumer to read messages
        const peekConsumer = this.kafka.consumer({
          groupId: `${this.options.groupId}-peek-${Date.now()}`
        });

        try {
          await peekConsumer.connect();
          await peekConsumer.subscribe({
            topic: this.queueName,
            fromBeginning: false
          });

          const messagePromise = new Promise<void>((resolve) => {
            peekConsumer.run({
              eachMessage: async ({ message }) => {
                if (message.value && events.length < this.options.peekCount) {
                  const messageEvents = JSON.parse(
                    message.value.toString()
                  ) as EventEntity[];
                  events.push(...messageEvents);

                  if (events.length >= this.options.peekCount) {
                    resolve();
                  }
                }
              }
            });
          });

          await Promise.race([
            messagePromise,
            new Promise((resolve) => setTimeout(resolve, 5000))
          ]);

          if (events.length >= this.options.peekCount) {
            break;
          }
        } finally {
          await peekConsumer.disconnect();
        }
      }

      return events;
    } finally {
      await admin.disconnect();
    }
  }

  async start(): Promise<void> {
    await this.setupConsumer();
    await this.producer.connect();
  }

  async close(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
}
