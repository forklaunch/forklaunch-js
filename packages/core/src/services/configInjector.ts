import { extractArgumentNames, isNever } from '@forklaunch/common';
import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import {
  ConfigValidator,
  Constructed,
  Lifetime,
  ResolvedConfigValidator,
  Singleton
} from './types/configInjector.types';

export class ConfigInjector<
  SV extends AnySchemaValidator,
  CV extends ConfigValidator<SV>
> {
  instances: {
    [K in keyof CV]?: ResolvedConfigValidator<SV, CV>[K];
  } = {};

  private loadSingletons(): void {
    for (const token in this.dependenciesDefinition) {
      const definition = this.dependenciesDefinition[token];
      if (definition.lifetime === Lifetime.Singleton) {
        this.instances[token] = definition.value;
      }
    }
  }

  private resolveInstance<T extends keyof CV>(
    token: T,
    definition: Constructed<
      Omit<ResolvedConfigValidator<SV, CV>, T>,
      ResolvedConfigValidator<SV, CV>[T]
    >,
    context?: Record<string, unknown>,
    resolutionPath: (keyof CV)[] = []
  ): ResolvedConfigValidator<SV, CV>[T] {
    const injectorArgument = extractArgumentNames(definition.factory)[0];
    if (!injectorArgument.startsWith('{') || !injectorArgument.endsWith('}')) {
      throw new Error(
        `Invalid injector argument for ${String(token)}: ${injectorArgument}. Please use object destructuring syntax: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment.`
      );
    }
    const resolvedArguments = Object.fromEntries(
      injectorArgument
        .replace('{', '')
        .replace('}', '')
        .split(',')
        .map((arg) => arg.trim())
        .map((arg) => {
          resolutionPath = [...resolutionPath, token];

          if (resolutionPath.includes(arg)) {
            throw new Error(
              `Circular dependency detected: ${resolutionPath.join(' -> ')} -> ${arg}`
            );
          }
          const resolvedArg = this.resolve(arg, context, resolutionPath);
          return [arg, resolvedArg];
        })
    ) as unknown as Omit<ResolvedConfigValidator<SV, CV>, T>;
    return definition.factory(
      resolvedArguments,
      this.resolve.bind(this),
      context ?? ({} as Record<string, unknown>)
    );
  }

  constructor(
    private schemaValidator: SV,
    private configShapes: CV,
    private dependenciesDefinition: {
      [K in keyof CV]:
        | Singleton<ResolvedConfigValidator<SV, CV>[K]>
        | Constructed<
            Omit<ResolvedConfigValidator<SV, CV>, K>,
            ResolvedConfigValidator<SV, CV>[K]
          >;
    }
  ) {
    this.loadSingletons();
  }

  validateConfigSingletons(
    config: Partial<ResolvedConfigValidator<SV, CV>>
  ): boolean {
    return (this.schemaValidator as SchemaValidator).validate(
      Object.fromEntries(
        Object.entries(this.configShapes).filter(
          ([key]) =>
            this.dependenciesDefinition[key].lifetime === Lifetime.Singleton
        )
      ),
      config
    );
  }

  resolve<T extends keyof CV>(
    token: T,
    context?: Record<string, unknown>,
    resolutionPath: (keyof CV)[] = []
  ): ResolvedConfigValidator<SV, CV>[T] {
    const instance = this.instances[token];
    if (!instance) {
      const definition = this.dependenciesDefinition[token];

      if (!definition) {
        throw new Error(`Unable to resolve dependency ${String(token)}`);
      }

      switch (definition.lifetime) {
        case Lifetime.Singleton: {
          return definition.value;
        }
        case Lifetime.Scoped: {
          const scopedInstance = this.resolveInstance<T>(
            token,
            definition,
            context,
            resolutionPath
          );
          this.instances[token] = scopedInstance;
          return scopedInstance;
        }
        case Lifetime.Transient: {
          return this.resolveInstance<T>(
            token,
            definition,
            context,
            resolutionPath
          );
        }
        default: {
          isNever(definition);
          throw new Error(
            `Unable to resolve lifetime for dependency ${String(token)}, ${resolutionPath}`
          );
        }
      }
    } else {
      return instance;
    }
  }

  createScope(): ConfigInjector<SV, CV> {
    return new ConfigInjector<SV, CV>(
      this.schemaValidator,
      this.configShapes,
      this.dependenciesDefinition
    );
  }

  dispose(): void {
    this.instances = {};
    this.loadSingletons();
  }
}
