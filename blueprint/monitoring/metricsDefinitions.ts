import { metricsDefinitions } from '@forklaunch/core/http';

export type Metrics = typeof metrics;

export const metrics = metricsDefinitions({
  customMetric: 'counter'
});
