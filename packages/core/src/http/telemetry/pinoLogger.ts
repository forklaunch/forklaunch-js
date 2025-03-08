import { isNever } from '@forklaunch/common';
import { trace } from '@opentelemetry/api';
import { AnyValueMap, logs } from '@opentelemetry/api-logs';
import pino, { LevelWithSilent, LevelWithSilentOrString, Logger } from 'pino';

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

  log(level: LevelWithSilent, msg: string, meta: AnyValueMap = {}) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const activeSpanContext = activeSpan.spanContext();
      meta.trace_id = activeSpanContext.traceId;
      meta.span_id = activeSpanContext.spanId;
      meta.trace_flags = activeSpanContext.traceFlags;
      if (!meta.api_name) {
        // @ts-expect-error accessing private property
        meta = { ...meta, ...activeSpan?.attributes };
      }
    }

    this.pinoLogger[level](msg);
    logs.getLogger(process.env.OTEL_SERVICE_NAME ?? 'unknown').emit({
      severityText: level,
      severityNumber: mapSeverity(level),
      body: msg,
      attributes: { ...this.meta, ...meta }
    });
  }

  error(msg: string, meta: AnyValueMap = {}) {
    this.log('error', msg, meta);
  }

  info(msg: string, meta: AnyValueMap = {}) {
    this.log('info', msg, meta);
  }

  debug(msg: string, meta: AnyValueMap = {}) {
    this.log('debug', msg, meta);
  }

  warn(msg: string, meta: AnyValueMap = {}) {
    this.log('warn', msg, meta);
  }

  trace(msg: string, meta: AnyValueMap = {}) {
    this.log('trace', msg, meta);
  }

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
