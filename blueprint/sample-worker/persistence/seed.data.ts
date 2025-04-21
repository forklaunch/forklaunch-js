import { SampleWorkerEventRecord } from './seeders/sampleWorkerRecord.seeder';
//! Begin seed data
export const sampleWorkerEventRecord = SampleWorkerEventRecord.create({
  message: 'Hello, world!',
  processed: false,
  retryCount: 0
});
