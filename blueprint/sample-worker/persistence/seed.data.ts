import { SampleWorkerRecord } from './seeders/sampleWorkerRecord.seeder';
//! Begin seed data
export const sampleWorkerRecord = SampleWorkerRecord.create({
  message: 'Hello, world!',
  processed: false,
  retryCount: 0
});
