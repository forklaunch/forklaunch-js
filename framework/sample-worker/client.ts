import { bootstrap } from './bootstrapper';
import { SAMPLE_WORKER_CACHE_KEY_PREFIX } from './consts';
import { SampleWorkerRecord } from './models/persistence/sampleWorkerRecord.entity';

bootstrap((ci) => {
  const entityManager = ci.resolve('entityManager');
  const cache = ci.resolve('ttlCache');
  //   Database driven worker
  setInterval(async () => {
    const sampleRecordsToProcess = await entityManager
      .getRepository(SampleWorkerRecord)
      .findAll({
        where: {
          processed: false,
          retryCount: {
            $lt: 3
          }
        },
        orderBy: {
          createdAt: 'ASC'
        }
      });

    for (const record of sampleRecordsToProcess) {
      try {
        console.log('processing message:', record.message);
        record.processed = true;
      } catch (error) {
        console.error(error);
        record.retryCount++;
      }
      await entityManager.flush();
    }
  }, 1000);

  // Cache driven worker
  setInterval(async () => {
    const cachedRecordIds = await cache.listKeys(
      SAMPLE_WORKER_CACHE_KEY_PREFIX
    );
    for (const recordId of cachedRecordIds) {
      const record = await cache.readRecord<SampleWorkerRecord>(recordId);
      try {
        console.log('processing message:', record.value.message);
        cache.deleteRecord(recordId);
      } catch (error) {
        console.error(error);
        if (record.value.retryCount < 3) {
          cache.putRecord({
            key: recordId,
            value: {
              ...record.value,
              retryCount: record.value.retryCount + 1
            },
            ttlMilliseconds: 60000
          });
        }
      }
    }
  }, 1000);
});
