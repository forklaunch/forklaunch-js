import { OpenTelemetryCollector } from '../telemetry/openTelemetryCollector';
import { MetricsDefinition } from '../types/openTelemetryCollector.types';

export type RoutingStrategy = 'round-robin' | 'sticky' | 'random';

export interface ClusterConfig<ExpressApp> {
  port: number;
  host: string;
  workerCount: number;
  routingStrategy?: RoutingStrategy;
  expressApp: ExpressApp;
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  ssl?: {
    keyFile: string;
    certFile: string;
    caFile: string;
  };
}
