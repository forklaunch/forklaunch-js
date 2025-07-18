import {
  AnySchemaValidator,
  prettyPrintParseErrors
} from '@forklaunch/validator';
import { MapperConstructor } from '../interfaces/mappers.interface';
import { BaseMapper, construct } from './baseMapper.model';

/**
 * Abstract class representing a response entity mapper.
 *
 * @template Entity - A type that extends SqlBaseEntity.
 * @template SV - A type that extends AnySchemaValidator.
 * @extends {BaseMapper<SV>}
 */
export abstract class ResponseMapper<
  Entity,
  SV extends AnySchemaValidator
> extends BaseMapper<SV> {
  /**
   * The entity type.
   * @type {Entity}
   * @protected
   */
  _Entity!: Entity;

  /**
   * Populates entity mapper with DTO from an entity.
   *
   * @abstract
   * @param {Entity} entity - The entity to convert.
   * @param {...unknown[]} additionalArgs - Additional arguments.
   * @returns {this} - The instance of the ResponseMapper.
   */
  abstract fromEntity(
    entity: Entity,
    ...additionalArgs: unknown[]
  ): Promise<this>;

  /**
   * Converts the underlying DTO to a JSON object.
   *
   * @returns {this['_dto']} - The JSON object.
   * @throws {Error} - Throws an error if the DTO is invalid.
   */
  toDto(): Promise<this['_dto']> {
    const parsedSchema = this.schemaValidator.parse(
      this.schemaValidator.schemify(this.schema),
      this.dto
    );
    if (!parsedSchema.ok) {
      throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
    }
    return Promise.resolve(this.dto) as unknown as Promise<this['_dto']>;
  }

  /**
   * Serializes an entity to a JSON object.
   *
   * @param {Entity} entity - The entity to serialize.
   * @returns {this['_dto']} - The JSON object.
   * @throws {Error} - Throws an error if the DTO is invalid.
   */
  serializeEntityToDto(
    ...[entity, ...additionalArgs]: Parameters<this['fromEntity']>
  ): Promise<this['_dto']> {
    const result = this.fromEntity(entity, ...additionalArgs);
    return result.then((r) => r.toDto());
  }

  /**
   * Populates entity mapper with DTO from an entity.
   *
   * @template T - A type that extends ResponseMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @param {MapperConstructor<T, SV>} this - The constructor of the T.
   * @param {SV} schemaValidator - The schema provider.
   * @param {T['_Entity']} entity - The entity to convert.
   * @returns {T} - An instance of the T.
   */
  static fromEntity<
    T extends ResponseMapper<unknown, SV>,
    SV extends AnySchemaValidator
  >(
    this: MapperConstructor<T, SV>,
    schemaValidator: SV,
    ...[entity, ...additionalArgs]: Parameters<T['fromEntity']>
  ): Promise<T> {
    return construct(this, schemaValidator).fromEntity(
      entity,
      ...additionalArgs
    );
  }

  /**
   * Serializes an entity to a JSON object.
   *
   * @template T - A type that extends ResponseMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @param {MapperConstructor<T, SV>} this - The constructor of the T.
   * @param {SV} schemaValidator - The schema provider.
   * @param {T['_Entity']} entity - The entity to serialize.
   * @returns {T['_dto']} - The JSON object.
   * @throws {Error} - Throws an error if the DTO is invalid.
   */
  static serializeEntityToDto<
    T extends ResponseMapper<unknown, SV>,
    SV extends AnySchemaValidator,
    DtoType extends T['_dto']
  >(
    this: MapperConstructor<T, SV>,
    schemaValidator: SV,
    ...[entity, ...additionalArgs]: Parameters<T['fromEntity']>
  ): Promise<DtoType> {
    const result = construct(this, schemaValidator).fromEntity(
      entity,
      ...additionalArgs
    );
    return result.then((r) => r.toDto()) as Promise<DtoType>;
  }
}
