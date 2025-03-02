import pino from 'pino';

export function pinoLogger(level: string) {
  return pino({
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
}
