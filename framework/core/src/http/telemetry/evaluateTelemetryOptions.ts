import { TelemetryOptions } from '../types/openTelemetryCollector.types';

export function evaluateTelemetryOptions(telemetryOptions: TelemetryOptions) {
  return {
    enabled:
      typeof telemetryOptions.enabled === 'boolean'
        ? {
            metrics: telemetryOptions.enabled,
            tracing: telemetryOptions.enabled,
            logging: telemetryOptions.enabled
          }
        : {
            metrics: telemetryOptions.enabled.metrics,
            tracing: telemetryOptions.enabled.tracing,
            logging: telemetryOptions.enabled.logging
          },
    level: telemetryOptions.level
  };
}
