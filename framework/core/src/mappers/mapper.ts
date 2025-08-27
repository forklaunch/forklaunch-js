import {
  AnySchemaValidator,
  IdiomaticSchema,
  prettyPrintParseErrors,
  Schema,
  SchemaValidator
} from '@forklaunch/validator';
import { Constructor } from '@mikro-orm/core';

export function mapper<
  SV extends AnySchemaValidator,
  DtoSchema extends IdiomaticSchema<SV>,
  Entity,
  AdditionalArgs extends unknown[] = []
>(
  schemaValidator: SV,
  dtoSchema: DtoSchema,
  _entityConstructor: Constructor<Entity>,
  mapperDefinition:
    | {
        toEntity: (
          dto: Schema<DtoSchema, SV>,
          ...args: AdditionalArgs
        ) => Promise<Entity>;
      }
    | {
        toDto: (
          entity: Entity,
          ...args: AdditionalArgs
        ) => Promise<Schema<DtoSchema, SV>>;
      }
    | {
        toEntity: (
          dto: Schema<DtoSchema, SV>,
          ...args: AdditionalArgs
        ) => Promise<Entity>;
        toDto: (
          entity: Entity,
          ...args: AdditionalArgs
        ) => Promise<Schema<DtoSchema, SV>>;
      }
) {
  const sv = schemaValidator as SchemaValidator;
  return {
    schema: dtoSchema,
    toEntity: async (dto: Schema<DtoSchema, SV>, ...args: AdditionalArgs) => {
      if (!('toEntity' in mapperDefinition)) {
        throw new Error('toEntity not found in mapperDefinition');
      }
      const parsedSchema = sv.parse(sv.schemify(dtoSchema), dto);
      if (!parsedSchema.ok) {
        throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
      }
      return mapperDefinition.toEntity(
        dto as Schema<DtoSchema, SV>,
        ...(args as AdditionalArgs)
      );
    },
    toDto: async (entity: Entity, ...args: AdditionalArgs) => {
      if (!('toDto' in mapperDefinition)) {
        throw new Error('toDto not found in mapperDefinition');
      }
      const dto = await mapperDefinition.toDto(entity, ...args);

      const parsedSchema = sv.parse(sv.schemify(dtoSchema), dto);
      if (!parsedSchema.ok) {
        throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
      }
      return dto;
    }
  };
}
