import { Prettify } from '@forklaunch/common';
import {
  AnySchemaValidator,
  IdiomaticSchema,
  prettyPrintParseErrors,
  Schema,
  SchemaValidator
} from '@forklaunch/validator';
import { Constructor } from '@mikro-orm/core';

export function requestMapper<
  SV extends AnySchemaValidator,
  DomainSchema extends IdiomaticSchema<SV>,
  Entity,
  AdditionalArgs extends unknown[] = []
>(
  schemaValidator: SV,
  domainSchema: DomainSchema,
  _entityConstructor: Constructor<Entity>,
  mapperDefinition: {
    toEntity: (
      dto: Schema<DomainSchema, SV>,
      ...args: AdditionalArgs
    ) => Promise<Entity>;
  }
): {
  schema: DomainSchema;
} & typeof mapperDefinition {
  const sv = schemaValidator as SchemaValidator;
  return {
    ...mapperDefinition,
    schema: domainSchema,

    toEntity: async (
      dto: Schema<DomainSchema, SV>,
      ...args: AdditionalArgs
    ) => {
      const parsedSchema = sv.parse(sv.schemify(domainSchema), dto);
      if (!parsedSchema.ok) {
        throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
      }
      return mapperDefinition.toEntity(
        dto as Schema<DomainSchema, SV>,
        ...(args as AdditionalArgs)
      );
    }
  };
}

export function responseMapper<
  SV extends AnySchemaValidator,
  DomainSchema extends IdiomaticSchema<SV>,
  Entity,
  AdditionalArgs extends unknown[] = []
>(
  schemaValidator: SV,
  domainSchema: DomainSchema,
  _entityConstructor: Constructor<Entity>,
  mapperDefinition: {
    toDomain: (
      entity: Entity,
      ...args: AdditionalArgs
    ) => Promise<Schema<DomainSchema, SV>>;
  }
): Prettify<
  {
    schema: DomainSchema;
  } & typeof mapperDefinition
> {
  const sv = schemaValidator as SchemaValidator;
  return {
    ...mapperDefinition,
    schema: domainSchema,

    toDomain: async (entity: Entity, ...args: AdditionalArgs) => {
      const domain = await mapperDefinition.toDomain(entity, ...args);
      const parsedSchema = sv.parse(sv.schemify(domainSchema), domain);
      if (!parsedSchema.ok) {
        throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
      }
      return domain;
    }
  };
}
