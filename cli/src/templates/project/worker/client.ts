import { bootstrap } from './bootstrapper';
{{#cache_backend}}import { CACHE_KEY_PREFIX } from './consts';{{/cache_backend}}
import { {{pascal_case_name}}Record } from './persistence/entities/{{camel_case_name}}Record.entity';

bootstrap((ci, tokens) => { {{^cache_backend}}
  const entityManager = ci.resolve(tokens.EntityManager);
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

  setInterval(async () => {
    const sampleRecordsToProcess = await entityManager
      .getRepository({{pascal_case_name}}Record)
      .findAll({
        where: {
          processed: false,
          retryCount: {
            $lt: 3,
          },
        },
        orderBy: {
          createdAt: 'ASC'
        }
      });

    for (const record of sampleRecordsToProcess) {
      try {
        openTelemetryCollector.info(`processing message: ${record.message}`);
        record.processed = true;
      } catch (error) {
        openTelemetryCollector.error(error, 'error processing message');
        record.retryCount++;
      }
      await entityManager.flush();
    }
  }, 10000);{{/cache_backend}}{{#cache_backend}}
  const cache = ci.resolve(tokens.TtlCache);
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

  setInterval(async () => {
    const cachedRecordIds = await cache.listKeys(
      CACHE_KEY_PREFIX
    );
    for (const recordId of cachedRecordIds) {
      const record = await cache.readRecord<{{pascal_case_name}}Record>(recordId);
      try {
        openTelemetryCollector.info(`processing message: ${record.value.message}`);
        cache.deleteRecord(recordId);
      } catch (error) {
        openTelemetryCollector.error(error, 'error processing message');
        if (record.value.retryCount < 3) {
          cache.putRecord({
            key: recordId,
            value: {
              ...record.value,
              retryCount: record.value.retryCount + 1,
            },
            ttlMilliseconds: 60000,
          });
        }
      }
    }
  }, 10000);{{/cache_backend}}
});
