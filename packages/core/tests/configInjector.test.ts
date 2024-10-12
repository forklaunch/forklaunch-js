import { number, SchemaValidator, string } from '@forklaunch/validator/zod';
import { ConfigInjector } from '../src/services/configInjector';
import { Lifetime } from '../src/services/types/configInjector.types';

class X {
  constructor(
    public a: string,
    public b: () => number
  ) {}

  dummy() {
    return `${this.a}${this.b()}`;
  }
}

describe('serviceFactory', () => {
  const configInjector = new ConfigInjector(
    SchemaValidator(),
    {
      a: string,
      b: number,
      c: X,
      d: number,
      e: number,
      f: number
    },
    {
      a: {
        lifetime: Lifetime.Singleton,
        value: 'a'
      },
      b: {
        lifetime: Lifetime.Transient,
        factory: ({ a }) => 5
      },
      c: {
        lifetime: Lifetime.Scoped,
        factory: ({ a }, resolve, context) => {
          const b = () => resolve('b') * (context.num as number);
          return new X(a, b);
        }
      },
      d: {
        lifetime: Lifetime.Transient,
        factory: ({ e }) => e
      },
      e: {
        lifetime: Lifetime.Transient,
        factory: ({ f }) => f
      },
      f: {
        lifetime: Lifetime.Transient,
        factory: ({ d }) => d
      }
    }
  );

  test('loadSingletons', () => {
    expect(configInjector.instances).toEqual({
      a: 'a'
    });
  });

  test('basicResolve', () => {
    expect(configInjector.resolve('a')).toBe('a');
    expect(configInjector.resolve('b')).toBe(5);
    expect(
      configInjector
        .resolve('c', {
          num: 4
        })
        .dummy()
    ).toBe('a20');
    expect(Object.keys(configInjector.instances)).toEqual(['a', 'c']);
  });

  test('circular dependency', () => {
    expect(() =>
      configInjector.resolve('d')
    ).toThrowErrorMatchingInlineSnapshot(
      '[Error: Circular dependency detected: d -> e -> f -> d]'
    );
    expect(() =>
      configInjector.resolve('e')
    ).toThrowErrorMatchingInlineSnapshot(
      '[Error: Circular dependency detected: e -> f -> d -> e]'
    );
    expect(() => {
      configInjector.resolve('f');
    }).toThrowErrorMatchingInlineSnapshot(
      '[Error: Circular dependency detected: f -> d -> e -> f]'
    );
  });

  test('validateConfigSingletons', () => {
    expect(
      configInjector.validateConfigSingletons({
        a: 'a'
      })
    ).toBe(true);
    expect(
      configInjector.validateConfigSingletons({
        a: 5 as unknown as string
      })
    ).toBe(false);
  });

  test('createScope', () => {
    const scope = configInjector.createScope();
    expect(scope).toBeInstanceOf(ConfigInjector);
    expect(scope.instances).not.toEqual(configInjector.instances);
  });

  test('dispose', () => {
    configInjector.dispose();
    expect(configInjector.instances).toEqual({ a: 'a' });
  });
});