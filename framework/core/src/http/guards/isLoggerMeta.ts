import { LoggerMeta } from '../types/openTelemetryCollector.types';

export function isLoggerMeta(arg: unknown): arg is LoggerMeta {
  return typeof arg === 'object' && arg !== null && '_meta' in arg;
}
