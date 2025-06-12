import { RequiredEntityData } from '@mikro-orm/core';
import { SampleWorkerEventRecord } from './seeders/sampleWorkerRecord.seeder';
//! Begin seed data
export const sampleWorkerEventRecord = {
  message: 'Hello, world!',
  processed: false,
  retryCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<SampleWorkerEventRecord>;
