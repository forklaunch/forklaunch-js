import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, meta } from '../src/http/telemetry/pinoLogger';

// Mock OpenTelemetry to test error scenarios
vi.mock('@opentelemetry/api-logs', () => ({
  logs: {
    getLogger: vi.fn(() => ({
      emit: vi.fn()
    }))
  }
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: vi.fn(() => null)
  }
}));

describe('PinoLogger Error Handling', () => {
  let testLogger: ReturnType<typeof logger>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    testLogger = logger('debug');
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Circular Reference Handling', () => {
    it('should handle circular references without crashing', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        testLogger.info('Testing circular reference', circularObj);
      }).not.toThrow();
    });

    it('should handle deeply nested circular references', () => {
      const obj1: Record<string, unknown> = { id: 1 };
      const obj2: Record<string, unknown> = { id: 2, parent: obj1 };
      obj1.child = obj2;

      expect(() => {
        testLogger.error('Deep circular reference', obj1, obj2);
      }).not.toThrow();
    });
  });

  describe('Non-serializable Objects', () => {
    it('should handle functions without crashing', () => {
      const testFunction = () => console.log('test');

      expect(() => {
        testLogger.warn('Function object', { fn: testFunction });
      }).not.toThrow();
    });

    it('should handle undefined and null values correctly', () => {
      expect(() => {
        testLogger.debug('Null and undefined', null, undefined, {
          key: undefined
        });
      }).not.toThrow();
    });

    it('should handle symbols without crashing', () => {
      const sym = Symbol('test');

      expect(() => {
        testLogger.trace('Symbol object', { symbol: sym });
      }).not.toThrow();
    });
  });

  describe('OpenTelemetry Error Handling', () => {
    it('should fallback to console logging when OpenTelemetry fails', async () => {
      const { logs } = await import('@opentelemetry/api-logs');
      const mockEmit = vi.fn().mockImplementation(() => {
        throw new Error('OpenTelemetry emission failed');
      });

      (logs.getLogger as ReturnType<typeof vi.fn>).mockReturnValue({
        emit: mockEmit
      });

      testLogger.error('Test message with OTel failure');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to emit OpenTelemetry log:',
        expect.any(Error)
      );
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Complex Object Handling', () => {
    it('should handle mixed data types in a single log call', () => {
      const complexData = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'nested'
          }
        }
      };

      expect(() => {
        testLogger.info(
          'Complex data',
          complexData,
          'additional string',
          123,
          true
        );
      }).not.toThrow();
    });

    it('should handle Error objects properly', () => {
      const error = new Error('Test error message');
      error.stack = 'Mock stack trace';

      expect(() => {
        testLogger.error('Error occurred', error);
      }).not.toThrow();
    });

    it('should handle Date objects', () => {
      const date = new Date();

      expect(() => {
        testLogger.info('Date object', { timestamp: date });
      }).not.toThrow();
    });
  });

  describe('LoggerMeta Handling', () => {
    it('should properly filter and include metadata', () => {
      const metadata = meta({ requestId: '123', userId: 'user456' });

      expect(() => {
        testLogger.info('Message with metadata', metadata, 'additional info');
      }).not.toThrow();
    });

    it('should handle multiple metadata objects', () => {
      const meta1 = meta({ requestId: '123' });
      const meta2 = meta({ userId: 'user456' });

      expect(() => {
        testLogger.debug('Multiple metadata', meta1, meta2, 'message');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      expect(() => {
        testLogger.info('');
      }).not.toThrow();
    });

    it('should handle only metadata without message', () => {
      const metadata = meta({ key: 'value' });

      expect(() => {
        testLogger.warn(metadata);
      }).not.toThrow();
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: new Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, value: `item-${i}` }))
      };

      expect(() => {
        testLogger.debug('Large object', largeObject);
      }).not.toThrow();
    });

    it('should handle BigInt values', () => {
      const bigIntValue = BigInt(9007199254740991);

      expect(() => {
        testLogger.info('BigInt value', { value: bigIntValue });
      }).not.toThrow();
    });
  });

  describe('Child Logger Error Handling', () => {
    it('should create child loggers that inherit error handling', () => {
      const childLogger = testLogger.child({ service: 'test-service' });
      const circularObj: Record<string, unknown> = { name: 'child-test' };
      circularObj.self = circularObj;

      expect(() => {
        childLogger.error('Child logger with circular ref', circularObj);
      }).not.toThrow();
    });

    it('should handle nested child loggers', () => {
      const child1 = testLogger.child({ level1: 'test' });
      const child2 = child1.child({ level2: 'nested' });

      expect(() => {
        child2.info('Nested child logger', { complex: { data: 'test' } });
      }).not.toThrow();
    });
  });
});
