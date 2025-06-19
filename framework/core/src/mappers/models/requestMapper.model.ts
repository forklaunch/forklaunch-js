import {
  AnySchemaValidator,
  prettyPrintParseErrors
} from '@forklaunch/validator';
import { MapperConstructor } from '../interfaces/mappers.interface';
import { BaseMapper, construct } from './baseMapper.model';

/**
 * Abstract class representing a request entity mapper.
 *
 * @template Entity - A type that extends SqlBaseEntity.
 * @template SV - A type that extends AnySchemaValidator.
 * @extends {BaseMapper<SV>}
 */
export abstract class RequestMapper<
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
   * Converts the underlying DTO to an entity.
   *
   * @abstract
   * @param {...unknown[]} additionalArgs - Additional arguments.
   * @returns {Promise<Entity>} - The entity.
   */
  abstract toEntity(...additionalArgs: unknown[]): Promise<Entity>;

  /**
   * Populates the DTO with data from a JSON object.
   *
   * @param {this['_dto']} json - The JSON object.
   * @returns {Promise<this>} - The instance of the RequestMapper.
   */
  fromDto(json: this['_dto']): Promise<this> {
    const parsedSchema = this.schemaValidator.parse(
      this.schemaValidator.schemify(this.schema),
      json
    );
    if (!parsedSchema.ok) {
      throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
    }
    this.dto = json;
    return Promise.resolve(this);
  }

  /**
   * Deserializes a JSON object to an entity.
   *
   * @param {this['_dto']} json - The JSON object.
   * @param {...unknown[]} additionalArgs - Additional arguments.
   * @returns {Entity} - The entity.
   */
  deserializeDtoToEntity(
    json: this['_dto'],
    ...additionalArgs: Parameters<this['toEntity']>
  ): Promise<Entity> {
    const result = this.fromDto(json);
    return result.then((r) => r.toEntity(...additionalArgs));
  }

  /**
   * Creates an instance of a RequestMapper from a JSON object.
   *
   * @template T - A type that extends RequestMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @template JsonType - The type of the JSON object.
   * @param {MapperConstructor<T, SV>} this - The constructor of the T.
   * @param {SV} schemaValidator - The schema provider.
   * @param {JsonType} json - The JSON object.
   * @returns {T} - An instance of the T.
   */
  static fromDto<
    T extends RequestMapper<unknown, SV>,
    SV extends AnySchemaValidator,
    JsonType extends T['_dto']
  >(
    this: MapperConstructor<T, SV>,
    schemaValidator: SV,
    json: JsonType
  ): Promise<T> {
    return construct(this, schemaValidator).fromDto(json);
  }

  /**
   * Deserializes a JSON object to an entity.
   *
   * @template T - A type that extends RequestMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @template JsonType - The type of the JSON object.
   * @param {MapperConstructor<T, SV>} this - The constructor of the T.
   * @param {SV} schemaValidator - The schema provider.
   * @param {JsonType} json - The JSON object.
   * @param {...unknown[]} additionalArgs - Additional arguments.
   * @returns {T['_Entity']} - The entity.
   */
  static deserializeDtoToEntity<
    T extends RequestMapper<unknown, SV>,
    SV extends AnySchemaValidator,
    JsonType extends T['_dto']
  >(
    this: MapperConstructor<T, SV>,
    schemaValidator: SV,
    json: JsonType,
    ...additionalArgs: Parameters<T['toEntity']>
  ): Promise<T['_Entity']> {
    const result = construct(this, schemaValidator).fromDto(json);
    return result.then((r) => r.toEntity(...additionalArgs));
  }
}
