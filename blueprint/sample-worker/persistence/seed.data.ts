import { SampleWorkerEvent } from './seeders/sampleWorkerEvent.seeder';
//! Begin seed data
export const sampleWorkerEvent = SampleWorkerEvent.create({
  message: 'Hello, world!',
  processed: false,
  retryCount: 0
});
