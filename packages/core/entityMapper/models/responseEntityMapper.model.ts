import { AnySchemaValidator } from '@forklaunch/validator';
import { BaseEntity } from '../../database/mikro/models/entities/base.entity';
import { EntityMapperConstructor } from '../interfaces/entityMapper.interface';
import { BaseEntityMapper, construct } from './baseEntityMapper.model';

/**
 * Abstract class representing a response entity mapper.
 *
 * @template Entity - A type that extends BaseEntity.
 * @template SV - A type that extends AnySchemaValidator.
 * @extends {BaseEntityMapper<SV>}
 */
export abstract class ResponseEntityMapper<
  Entity extends BaseEntity,
  SV extends AnySchemaValidator
> extends BaseEntityMapper<SV> {
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
   * @returns {this} - The instance of the ResponseEntityMapper.
   */
  abstract fromEntity(entity: Entity, ...additionalArgs: unknown[]): this;

  /**
   * Converts the underlying DTO to a JSON object.
   *
   * @returns {this['_dto']} - The JSON object.
   * @throws {Error} - Throws an error if the DTO is invalid.
   */
  toJson(): this['_dto'] {
    if (
      !this.schemaValidator.validate(
        this.schemaValidator.schemify(this.schema),
        this.dto
      )
    ) {
      throw new Error('Invalid DTO');
    }
    return this.dto;
  }

  /**
   * Serializes an entity to a JSON object.
   *
   * @param {Entity} entity - The entity to serialize.
   * @returns {this['_dto']} - The JSON object.
   * @throws {Error} - Throws an error if the DTO is invalid.
   */
  serializeEntityToJson(entity: Entity): this['_dto'] {
    return this.fromEntity(entity).toJson();
  }

  /**
   * Populates entity mapper with DTO from an entity.
   *
   * @template T - A type that extends ResponseEntityMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @param {EntityMapperConstructor<T, SV>} this - The constructor of the T.
   * @param {SV} schemaValidator - The schema provider.
   * @param {T['_Entity']} entity - The entity to convert.
   * @returns {T} - An instance of the T.
   */
  static fromEntity<
    T extends ResponseEntityMapper<BaseEntity, SV>,
    SV extends AnySchemaValidator
  >(
    this: EntityMapperConstructor<T, SV>,
    schemaValidator: SV,
    entity: T['_Entity']
  ): T {
    return construct(this, schemaValidator).fromEntity(entity);
  }

  /**
   * Serializes an entity to a JSON object.
   *
   * @template T - A type that extends ResponseEntityMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @param {EntityMapperConstructor<T, SV>} this - The constructor of the T.
   * @param {SV} schemaValidator - The schema provider.
   * @param {T['_Entity']} entity - The entity to serialize.
   * @returns {T['_dto']} - The JSON object.
   * @throws {Error} - Throws an error if the DTO is invalid.
   */
  static serializeEntityToJson<
    T extends ResponseEntityMapper<BaseEntity, SV>,
    SV extends AnySchemaValidator
  >(
    this: EntityMapperConstructor<T, SV>,
    schemaValidator: SV,
    entity: T['_Entity']
  ): T['_dto'] {
    return construct(this, schemaValidator).serializeEntityToJson(entity);
  }
}
