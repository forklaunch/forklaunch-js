import { describe, expect, it } from 'vitest';
import { safeStringify } from '../src/safeStringify';

describe('safeStringify', () => {
  it('should handle primitive types', () => {
    expect(safeStringify('test')).toBe('test');
    expect(safeStringify(123)).toBe('123');
    expect(safeStringify(true)).toBe('true');
    expect(safeStringify(null)).toBe('null');
    expect(safeStringify(undefined)).toBe('undefined');
  });

  it('should handle Error objects', () => {
    const error = new Error('test error');
    const result = JSON.parse(safeStringify(error));
    expect(result.name).toBe('Error');
    expect(result.message).toBe('test error');
    expect(result.stack).toBeDefined();
  });

  it('should handle circular references', () => {
    const circular = { a: 1 };
    Object.assign(circular, { self: circular });
    expect(safeStringify(circular)).toBe(
      '{"a":1,"self":"[Circular Reference]"}'
    );
  });

  it('should handle special types', () => {
    expect(safeStringify(BigInt(123))).toBe('"123n"');
    expect(safeStringify(Symbol('test'))).toBe('"Symbol(test)"');
    expect(safeStringify(() => {})).toBe('"[Function: anonymous]"');
    expect(safeStringify(function named() {})).toBe('"[Function: named]"');
  });

  it('should handle special number values', () => {
    expect(safeStringify(NaN)).toBe('"NaN"');
    expect(safeStringify(Infinity)).toBe('"Infinity"');
    expect(safeStringify(-Infinity)).toBe('"-Infinity"');
  });

  it('should handle built-in objects', () => {
    const date = new Date('2023-01-01');
    expect(safeStringify(date)).toBe('"2023-01-01T00:00:00.000Z"');
    expect(safeStringify(/test/g)).toBe('"/test/g"');
  });

  it('should handle collections', () => {
    const map = new Map([['key', 'value']]);
    const set = new Set([1, 2, 3]);

    expect(JSON.parse(safeStringify(map))).toEqual({
      __type: 'Map',
      value: [['key', 'value']]
    });

    expect(JSON.parse(safeStringify(set))).toEqual({
      __type: 'Set',
      value: [1, 2, 3]
    });
  });

  it('should handle typed arrays', () => {
    const uint8Array = new Uint8Array([1, 2, 3]);
    expect(JSON.parse(safeStringify(uint8Array))).toEqual({
      __type: 'Uint8Array',
      value: [1, 2, 3]
    });
  });

  it('should handle nested complex objects', () => {
    interface CircularRef {
      circular: unknown;
    }

    const complex = {
      error: new Error('test'),
      fn: () => {},
      sym: Symbol('test'),
      date: new Date('2023-01-01'),
      map: new Map([['key', 'value']]),
      nested: {
        array: [1, 2, { circular: null } as CircularRef]
      }
    };
    const circularRef = complex.nested.array[2] as CircularRef;
    circularRef.circular = complex;

    const result = JSON.parse(safeStringify(complex));
    expect(result.error.message).toBe('test');
    expect(result.fn).toBe('[Function: fn]');
    expect(result.sym).toBe('Symbol(test)');
    expect(result.date).toBe('2023-01-01T00:00:00.000Z');
    expect(result.nested.array[2].circular).toBe('[Circular Reference]');
  });

  it('should handle unserializable objects', () => {
    const unserializable = {
      toJSON() {
        throw new Error('Cannot serialize');
      }
    };
    expect(safeStringify(unserializable)).toBe(
      '[Unserializable: Cannot serialize]'
    );

    const unknownError = {
      toJSON() {
        throw 'Unknown error';
      }
    };
    expect(safeStringify(unknownError)).toBe('[Unserializable: Unknown error]');
  });
});
