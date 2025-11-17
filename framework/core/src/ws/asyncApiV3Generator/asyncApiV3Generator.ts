import type {
  AsyncAPIObject,
  ChannelObject,
  ChannelsObject,
  MessageObject,
  MessagesObject,
  OperationObject,
  OperationsObject,
  ReferenceObject
} from '@asyncapi/parser/esm/spec-types/v3';

import type { AnySchemaValidator } from '@forklaunch/validator';

import { EventSchema, EventSchemaEntry } from '../types/eventSchema.types';

export type AsyncApiDocument = AsyncAPIObject;

export function generateAsyncApi<SV extends AnySchemaValidator>(
  eventSchemas: EventSchema<SV>,
  options?: {
    title?: string;
    version?: string;
    description?: string;
    id?: AsyncApiDocument['id'];
    defaultContentType?: AsyncApiDocument['defaultContentType'];
  }
): AsyncApiDocument {
  const channels: ChannelsObject = {};

  const appendMessageToChannel = (
    collection?: Record<string, EventSchemaEntry<SV>>
  ) => {
    if (!collection) {
      return;
    }

    Object.entries(collection).forEach(([messageKey, candidate]) => {
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate) ||
        !('shape' in candidate)
      ) {
        return;
      }

      const entry = candidate as EventSchemaEntry<SV>;
      const schema = entry.shape;

      // Determine which channels to use
      const channelNames: string[] = entry.channel
        ? [entry.channel]
        : entry.channels && entry.channels.length > 0
          ? entry.channels
          : [messageKey];

      const messageName =
        entry.operation ?? entry.operations?.[0] ?? messageKey;

      // Add message to all specified channels
      channelNames.forEach((channelName) => {
        const existingChannel = channels[channelName];
        if (!existingChannel || '$ref' in existingChannel) {
          channels[channelName] = {
            address: channelName,
            messages: {}
          };
        }

        const channelEntry = channels[channelName] as ChannelObject;
        channelEntry.messages = (channelEntry.messages ?? {}) as MessagesObject;
        const messages = channelEntry.messages as MessagesObject;

        const message: MessageObject = {
          name: messageName,
          payload: schema
        };

        messages[messageName] = message;
      });
    });
  };

  appendMessageToChannel(eventSchemas.clientMessages);
  appendMessageToChannel(eventSchemas.serverMessages);
  appendMessageToChannel(eventSchemas.errors);

  const operations: OperationsObject = {};

  const addOperationsForCollection = (
    collection: Record<string, EventSchemaEntry<SV>> | undefined,
    action: 'send' | 'receive'
  ) => {
    if (!collection) {
      return;
    }

    Object.entries(collection).forEach(([messageKey, candidate]) => {
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate) ||
        !('shape' in candidate)
      ) {
        return;
      }

      const entry = candidate as EventSchemaEntry<SV>;

      // Determine which channels to use
      const channelNames: string[] = entry.channel
        ? [entry.channel]
        : entry.channels && entry.channels.length > 0
          ? entry.channels
          : [messageKey];

      const messageName =
        entry.operation ?? entry.operations?.[0] ?? messageKey;

      // Create operations for all specified channels
      channelNames.forEach((channelName) => {
        const operationKey = `${action}-${channelName}-${messageName}`;

        const operation: OperationObject = {
          action,
          channel: {
            $ref: `#/channels/${channelName}`
          } as ReferenceObject,
          messages: [
            {
              $ref: `#/channels/${channelName}/messages/${messageName}`
            } as ReferenceObject
          ]
        };

        operations[operationKey] = operation;
      });
    });
  };

  addOperationsForCollection(eventSchemas.clientMessages, 'receive');
  addOperationsForCollection(eventSchemas.serverMessages, 'send');

  const { title, version, description } = options ?? {};

  const asyncApiDocument: AsyncApiDocument = {
    asyncapi: '3.0.0',
    info: {
      title: title || process.env.API_TITLE || 'Forklaunch WebSocket API',
      version: version || '1.0.0',
      ...(description ? { description } : {})
    },
    ...(options?.id ? { id: options.id } : {}),
    ...(options?.defaultContentType
      ? { defaultContentType: options.defaultContentType }
      : {}),
    ...(Object.keys(channels).length > 0 ? { channels } : {}),
    ...(Object.keys(operations).length > 0 ? { operations } : {})
  };

  return asyncApiDocument;
}
