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
  DtoSchema extends IdiomaticSchema<SV>,
  Entity,
  AdditionalArgs extends unknown[] = []
>(
  schemaValidator: SV,
  dtoSchema: DtoSchema,
  _entityConstructor: Constructor<Entity>,
  mapperDefinition: {
    toEntity: (
      dto: Schema<DtoSchema, SV>,
      ...args: AdditionalArgs
    ) => Promise<Entity>;
  }
): {
  schema: DtoSchema;
} & typeof mapperDefinition {
  const sv = schemaValidator as SchemaValidator;
  return {
    ...mapperDefinition,
    schema: dtoSchema,

    toEntity: async (dto: Schema<DtoSchema, SV>, ...args: AdditionalArgs) => {
      const parsedSchema = sv.parse(sv.schemify(dtoSchema), dto);
      if (!parsedSchema.ok) {
        throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
      }
      return mapperDefinition.toEntity(
        dto as Schema<DtoSchema, SV>,
        ...(args as AdditionalArgs)
      );
    }
  };
}

export function responseMapper<
  SV extends AnySchemaValidator,
  DtoSchema extends IdiomaticSchema<SV>,
  Entity,
  AdditionalArgs extends unknown[] = []
>(
  schemaValidator: SV,
  dtoSchema: DtoSchema,
  _entityConstructor: Constructor<Entity>,
  mapperDefinition: {
    toDto: (
      entity: Entity,
      ...args: AdditionalArgs
    ) => Promise<Schema<DtoSchema, SV>>;
  }
): Prettify<
  {
    schema: DtoSchema;
  } & typeof mapperDefinition
> {
  const sv = schemaValidator as SchemaValidator;
  return {
    ...mapperDefinition,
    schema: dtoSchema,

    toDto: async (entity: Entity, ...args: AdditionalArgs) => {
      const dto = await mapperDefinition.toDto(entity, ...args);
      const parsedSchema = sv.parse(sv.schemify(dtoSchema), dto);
      if (!parsedSchema.ok) {
        throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
      }
      return dto;
    }
  };
}
