import { isNever, safeStringify } from '@forklaunch/common';
import { trace } from '@opentelemetry/api';
import { AnyValueMap, logs } from '@opentelemetry/api-logs';
import pino, { LevelWithSilent, LevelWithSilentOrString, Logger } from 'pino';
import PinoPretty from 'pino-pretty';
import { isLoggerMeta } from '../guards/isLoggerMeta';
import { LogFn, LoggerMeta } from '../types/openTelemetryCollector.types';

export function meta(meta: Record<string, unknown>) {
  return meta as LoggerMeta;
}

function mapSeverity(level: LevelWithSilent) {
  switch (level) {
    case 'silent':
      return 0;
    case 'trace':
      return 1;
    case 'debug':
      return 5;
    case 'info':
      return 9;
    case 'warn':
      return 13;
    case 'error':
      return 17;
    case 'fatal':
      return 21;
    default:
      isNever(level);
      return 0;
  }
}

class PinoLogger {
  private pinoLogger: Logger;
  private meta: AnyValueMap;
  private prettyPrinter = PinoPretty.prettyFactory({
    colorize: true
  });

  constructor(level: LevelWithSilentOrString, meta: AnyValueMap = {}) {
    this.pinoLogger = pino({
      level: level || 'info',
      formatters: {
        level(label) {
          return { level: label };
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    });
    this.meta = meta;
  }

  log(level: LevelWithSilent, ...args: (string | unknown | LoggerMeta)[]) {
    let meta: AnyValueMap = {};

    const filteredArgs = args
      .filter((arg) => {
        if (isLoggerMeta(arg)) {
          Object.assign(meta, arg);
          return false;
        }
        return true;
      })
      .map(safeStringify) as Parameters<pino.LogFn>;

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const activeSpanContext = activeSpan.spanContext();
      meta.trace_id = activeSpanContext.traceId;
      meta.span_id = activeSpanContext.spanId;
      meta.trace_flags = activeSpanContext.traceFlags;
      meta = {
        // @ts-expect-error accessing private property
        ...activeSpan.attributes,
        ...meta
      };
    }

    meta = {
      'api.name': 'none',
      'correlation.id': 'none',
      ...meta
    };

    this.pinoLogger[level](...filteredArgs);
    logs.getLogger(process.env.OTEL_SERVICE_NAME ?? 'unknown').emit({
      severityText: level,
      severityNumber: mapSeverity(level),
      body: this.prettyPrinter(filteredArgs),
      attributes: { ...this.meta, ...meta }
    });
  }

  error: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => this.log('error', msg, ...args);

  info: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => this.log('info', msg, ...args);

  debug: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => this.log('debug', msg, ...args);
  warn: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => this.log('warn', msg, ...args);

  trace: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => this.log('trace', msg, ...args);

  child(meta: AnyValueMap = {}) {
    return new PinoLogger(this.pinoLogger.level, { ...this.meta, ...meta });
  }

  getBaseLogger() {
    return this.pinoLogger;
  }
}

export function logger(level: LevelWithSilentOrString, meta: AnyValueMap = {}) {
  return new PinoLogger(level, meta);
}
