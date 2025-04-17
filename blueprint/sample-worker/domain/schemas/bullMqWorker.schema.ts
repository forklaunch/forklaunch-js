import {
  any,
  array,
  boolean,
  date,
  enum_,
  function_,
  literal,
  null_,
  number,
  optional,
  promise,
  record,
  string,
  undefined_,
  union,
  unknown,
  void_
} from '@forklaunch/blueprint-core';
import { SpanKind } from 'bullmq';

const BullMqWorkerKeepJobsSchema = {
  age: optional(number),
  count: optional(number)
};

const BullMqWorkerBackoffOptionsSchema = {
  type: union([literal('fixed'), literal('exponential')]),
  delay: optional(number)
};

const BullMqWorkerDefaultJobOptionsSchema = {
  timestamp: optional(number),
  priority: optional(number),
  delay: optional(number),
  attempts: optional(number),
  backoff: optional(union([number, BullMqWorkerBackoffOptionsSchema])),
  lifo: optional(boolean),
  removeOnComplete: optional(
    union([boolean, number, BullMqWorkerKeepJobsSchema])
  ),
  removeOnFail: optional(union([boolean, number, BullMqWorkerKeepJobsSchema])),
  keepLogs: optional(number),
  stackTraceLimit: optional(number),
  sizeLimit: optional(number)
};

const BullMqWorkerAdvancedRepeatOptionsSchema = {
  repeatStrategy: optional(
    function_(
      [
        number,
        {
          pattern: optional(string),
          key: optional(string),
          limit: optional(number),
          every: optional(number),
          immediately: optional(boolean),
          count: optional(number),
          offset: optional(number),
          prevMillis: optional(number),
          jobId: optional(string),
          currentDate: optional(date),
          startDate: optional(date),
          endDate: optional(date),
          utc: optional(boolean),
          tz: optional(string),
          nthDayOfWeek: optional(number)
        },
        optional(string)
      ],
      union([number, undefined_, promise(union([number, undefined_]))])
    )
  ),
  repeatKeyHashAlgorithm: optional(string)
};

const BullMqWorkerTelemetryAttributeValueSchema = union([
  string,
  number,
  boolean,
  array(union([string, null_, undefined_])),
  array(union([number, null_, undefined_])),
  array(union([boolean, null_, undefined_]))
]);

const BullMqWorkerTelemetryAttributesSchema = record(
  string,
  union([BullMqWorkerTelemetryAttributeValueSchema, undefined_])
);

const BullMqWorkerTelemetrySchema = optional({
  tracer: {
    startSpan: function_(
      [
        string,
        optional({
          kind: optional(enum_(SpanKind))
        }),
        optional(unknown)
      ],
      {
        setSpanOnContext: function_([unknown], unknown),
        setAttribute: function_(
          [string, BullMqWorkerTelemetryAttributeValueSchema],
          void_
        ),
        setAttributes: function_(
          [BullMqWorkerTelemetryAttributesSchema],
          void_
        ),
        addEvent: function_(
          [string, optional(BullMqWorkerTelemetryAttributesSchema)],
          void_
        ),
        recordException: function_([unknown, optional(number)], void_),
        end: function_([], void_)
      }
    )
  },
  contextManager: {
    with: function_([unknown, function_([any], any)], any),
    active: function_([], unknown),
    getMetadata: function_([unknown], string),
    fromMetadata: function_([unknown, string], unknown)
  }
});

const BullMqWorkerQueueOptionsSchema = {
  connection: {
    skipVersionCheck: optional(boolean),
    url: optional(string)
  },
  blockingConnection: optional(boolean),
  prefix: optional(string),
  telemetry: BullMqWorkerTelemetrySchema,
  skipWaitingForReady: optional(boolean),
  defaultJobOptions: optional(BullMqWorkerDefaultJobOptionsSchema),
  streams: optional({
    events: {
      maxLen: number
    }
  }),
  skipMetasUpdate: optional(boolean),
  settings: optional(BullMqWorkerAdvancedRepeatOptionsSchema)
};

export const BullMqWorkerOptionsSchema = {
  ...BullMqWorkerQueueOptionsSchema,
  backoffType: union([literal('exponential'), literal('fixed')]),
  retries: number,
  interval: number
};
