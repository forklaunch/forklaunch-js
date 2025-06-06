import { SampleWorkerEventRecord } from './seeders/sampleWorkerRecord.seeder';
//! Begin seed data
export const sampleWorkerEventRecord = async () =>
  SampleWorkerEventRecord.create({
    message: 'Hello, world!',
    processed: false,
    retryCount: 0
  });
