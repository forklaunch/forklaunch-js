import {
  AnySchemaValidator,
  IdiomaticSchema,
  Schema
} from '@forklaunch/validator';
import { ConfigInjector } from '../configInjector';

export enum Lifetime {
  Singleton,
  Transient,
  Scoped
}

export type Singleton<Value> = {
  lifetime: Lifetime.Singleton;
  value: Value;
};

export type Constructed<Args, Return> = {
  lifetime: Lifetime.Transient | Lifetime.Scoped;
  factory: (
    args: Args,
    resolve: <T extends keyof Args>(
      token: T,
      context?: Record<string, unknown>
    ) => Args[T],
    context: Record<string, unknown>
  ) => Return;
};

export type Constructor = new (...args: never[]) => unknown;
export type SchemaConstructor<SV extends AnySchemaValidator> = new (
  ...args: unknown[]
) => IdiomaticSchema<SV>;
export type Function = (...args: never[]) => unknown;
export type SchemaFunction<SV extends AnySchemaValidator> = (
  args: unknown
) => IdiomaticSchema<SV>;

export type ConfigValidator<SV extends AnySchemaValidator> = Record<
  string,
  | Function
  | SchemaFunction<SV>
  | Constructor
  | SchemaConstructor<SV>
  | IdiomaticSchema<SV>
>;

export type ResolvedConfigValidator<
  SV extends AnySchemaValidator,
  CV extends ConfigValidator<SV>
> = {
  [M in keyof CV]: CV[M] extends SchemaConstructor<SV>
    ? Schema<InstanceType<CV[M]>, SV>
    : CV[M] extends SchemaFunction<SV>
      ? Schema<ReturnType<CV[M]>, SV>
      : CV[M] extends Function
        ? ReturnType<CV[M]>
        : CV[M] extends Constructor
          ? InstanceType<CV[M]>
          : Schema<CV[M], SV>;
};

export type ScopedDependencyFactory<
  SV extends AnySchemaValidator,
  CV extends ConfigValidator<SV>,
  M extends keyof CV
> = (scope?: ConfigInjector<SV, CV>) => ResolvedConfigValidator<SV, CV>[M];

export type ValidConfigInjector<
  SV extends AnySchemaValidator,
  CV extends ConfigValidator<SV>
> = ConfigInjector<SV, CV> & { validResolvedConfigValidator: void };
