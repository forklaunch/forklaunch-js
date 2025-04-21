use crate::constants::WorkerBackend;

pub(crate) fn get_worker_backend_name(backend: &WorkerBackend) -> String {
    match backend {
        WorkerBackend::BullMQCache => "BullMq".to_string(),
        WorkerBackend::Database => "Database".to_string(),
        WorkerBackend::Kafka => "Kafka".to_string(),
        WorkerBackend::RedisCache => "Redis".to_string(),
    }
}

const DEFAULT_BULLMQ_WORKER_OPTIONS: &str = "factory: ({ REDIS_URL }) => ({
  backoffType: 'exponential' as const,
  connection: {
    url: REDIS_URL
  },
  retries: 3,
  interval: 5000
})";
const DEFAULT_DATABASE_WORKER_OPTIONS: &str = "value: {
  retries: 3,
  interval: 5000
}";
const DEFAULT_KAFKA_WORKER_OPTIONS: &str =
    "factory: ({ KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID }) => ({
  brokers: KAFKA_BROKERS,
  clientId: KAFKA_CLIENT_ID,
  groupId: KAFKA_GROUP_ID,
  retries: 3,
  interval: 5000,
  peekCount: 100
})";
const DEFAULT_REDIS_WORKER_OPTIONS: &str = "factory: ({ REDIS_URL }) => ({
  backoffType: 'exponential' as const,
  connection: {
    url: REDIS_URL
  },
  retries: 3,
  interval: 5000
})";

pub(crate) fn get_default_worker_options(backend: &WorkerBackend) -> String {
    match backend {
        WorkerBackend::BullMQCache => DEFAULT_BULLMQ_WORKER_OPTIONS.to_string(),
        WorkerBackend::Database => DEFAULT_DATABASE_WORKER_OPTIONS.to_string(),
        WorkerBackend::Kafka => DEFAULT_KAFKA_WORKER_OPTIONS.to_string(),
        WorkerBackend::RedisCache => DEFAULT_REDIS_WORKER_OPTIONS.to_string(),
    }
}

fn get_database_worker_consumer_factory(pascal_case_name: &str) -> String {
    format!(
        "
({{ EntityManager, WorkerOptions }}) =>
  (
    processEventsFunction: WorkerProcessFunction<{}EventRecord>,
    failureHandler: WorkerFailureHandler<{}EventRecord>
  ) =>
    new DatabaseWorkerConsumer(
      {{pascal_case_name}}EventRecord,
      EntityManager,
      WorkerOptions,
      processEventsFunction,
      failureHandler
    )",
        pascal_case_name, pascal_case_name
    )
}
fn get_bullmq_worker_consumer_factory(pascal_case_name: &str) -> String {
    format!(
        "({{ QUEUE_NAME, WorkerOptions }}) =>
  (
    processEventsFunction: WorkerProcessFunction<{}EventRecord>,
    failureHandler: WorkerFailureHandler<{}EventRecord>
  ) =>
    new BullMqWorkerConsumer(
      QUEUE_NAME,
      WorkerOptions,
      processEventsFunction,
      failureHandler
    )",
        pascal_case_name, pascal_case_name
    )
}
fn get_kafka_worker_consumer_factory(pascal_case_name: &str) -> String {
    format!(
        "({{ QUEUE_NAME, WorkerOptions }}) =>
  (
    processEventsFunction: WorkerProcessFunction<{}EventRecord>,
    failureHandler: WorkerFailureHandler<{}EventRecord>
  ) =>
    new KafkaWorkerConsumer(
      QUEUE_NAME,
      WorkerOptions,
      processEventsFunction,
      failureHandler
    )",
        pascal_case_name, pascal_case_name
    )
}
fn get_redis_worker_consumer_factory(pascal_case_name: &str) -> String {
    format!(
        "({{ TtlCache, QUEUE_NAME, WorkerOptions }}) =>(
  (
    processEventsFunction: WorkerProcessFunction<{}EventRecord>,
    failureHandler: WorkerFailureHandler<{}EventRecord>
  ) =>
    new RedisWorkerConsumer(
      QUEUE_NAME,
      TtlCache,
      WorkerOptions,
      processEventsFunction,
      failureHandler
    )",
        pascal_case_name, pascal_case_name
    )
}

pub(crate) fn get_worker_consumer_factory(
    backend: &WorkerBackend,
    pascal_case_name: &str,
) -> String {
    match backend {
        WorkerBackend::BullMQCache => get_bullmq_worker_consumer_factory(pascal_case_name),
        WorkerBackend::Database => get_database_worker_consumer_factory(pascal_case_name),
        WorkerBackend::Kafka => get_kafka_worker_consumer_factory(pascal_case_name),
        WorkerBackend::RedisCache => get_redis_worker_consumer_factory(pascal_case_name),
    }
}

const BULLMQ_WORKER_PRODUCER_FACTORY: &str = "({ QUEUE_NAME, WorkerOptions }) =>
  new DatabaseWorkerProducer(
    EntityManager,
    WorkerOptions
  )";
const DATABASE_WORKER_PRODUCER_FACTORY: &str = "({ EntityManager, WorkerOptions }) =>
  new DatabaseWorkerProducer(
    EntityManager,
    WorkerOptions
  )";
const KAFKA_WORKER_PRODUCER_FACTORY: &str = "({ QUEUE_NAME, WorkerOptions }) =>
  new KafkaWorkerProducer(
    QUEUE_NAME,
    WorkerOptions
  )";
const REDIS_WORKER_PRODUCER_FACTORY: &str = "({ TtlCache, QUEUE_NAME, WorkerOptions }) =>
  new RedisWorkerProducer(
    QUEUE_NAME,
    TtlCache,
    WorkerOptions
  )";

pub(crate) fn get_worker_producer_factory(backend: &WorkerBackend) -> String {
    match backend {
        WorkerBackend::BullMQCache => BULLMQ_WORKER_PRODUCER_FACTORY.to_string(),
        WorkerBackend::Database => DATABASE_WORKER_PRODUCER_FACTORY.to_string(),
        WorkerBackend::Kafka => KAFKA_WORKER_PRODUCER_FACTORY.to_string(),
        WorkerBackend::RedisCache => REDIS_WORKER_PRODUCER_FACTORY.to_string(),
    }
}
