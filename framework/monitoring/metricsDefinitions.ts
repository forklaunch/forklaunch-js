import { MetricsDefinition } from '@forklaunch/core/http';

export type ForklaunchMetrics = typeof metricsDefinitions;
export const metricsDefinitions: MetricsDefinition = {
  customMetric: 'counter'
};
