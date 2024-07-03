import { SchemaValidator } from "@forklaunch/validator/interfaces";
import { BaseEntity } from "../../database/mikro/models/entities/base.entity";
import { EntityMapperConstructor } from "../interfaces/entityMapper.interface";
import { EntityMapperStaticSchema } from "../types/entityMapper.types";
import { BaseEntityMapper, construct } from "./baseEntityMapper.model";

/**
 * Abstract class representing a response entityMapper.
 *
 * @template Entity - A type that extends BaseEntity.
 * @template SV - A type that extends SchemaValidator.
 * @extends {BaseEntityMapper<SV>}
 */
export abstract class ResponseEntityMapper<Entity extends BaseEntity | unknown, SV extends SchemaValidator> extends BaseEntityMapper<SV> {
    /**
     * The entity type.
     * @type {Entity}
     * @protected
     */
    _Entity!: Entity;

    /**
     * Populates entityMapper with DTO from an entity.
     *
     * @abstract
     * @param {Entity} entity - The entity to convert.
     * @returns {this} - The instance of the ResponseEntityMapper.
     */
    abstract fromEntity(entity: Entity, ...additionalArgs: unknown[]): this;

    /**
     * Converts the underlying DTO to a JSON object.
     *
     * @param {...unknown[]} additionalArgs - Additional arguments.
     * @returns {this['_dto']} - The JSON object.
     */
    toJson(): this['_dto'] {
        if (!this.schemaValidator.validate(this.schemaValidator.schemify(this.schema), this.dto)) {
            throw new Error('Invalid DTO');
        }
        return this.dto;
    }

    /**
     * Serializes an entity to a JSON object.
     *
     * @param {Entity} entity - The entity to serialize.
     * @returns {this['_dto']} - The JSON object.
     */
    serializeEntityToJson(entity: Entity): this['_dto'] {
        return this.fromEntity(entity).toJson();
    }

    /**
     * Populates entityMapper with DTO from an entity.
     *
     * @template EntityMapperType - A type that extends ResponseEntityMapper.
     * @param {EntityMapperConstructor<EntityMapperType>} this - The constructor of the EntityMapperType.
     * @param {EntityMapperType['_Entity']} entity - The entity to convert.
     * @returns {EntityMapperType} - An instance of the EntityMapperType.
     */
    static fromEntity<EntityMapperType extends ResponseEntityMapper<unknown, any>>(this: EntityMapperConstructor<EntityMapperType, EntityMapperType['_SV']>, schemaValidator: EntityMapperType['_SV'], entity: EntityMapperType['_Entity']): EntityMapperType {
        return construct(this, schemaValidator).fromEntity(entity);
    }

    /**
     * Serializes an entity to a JSON object.
     *
     * @template EntityMapperType - A type that extends ResponseEntityMapper.
     * @param {EntityMapperConstructor<EntityMapperType>} this - The constructor of the EntityMapperType.
     * @param {EntityMapperType['_Entity']} entity - The entity to serialize.
     * @returns {EntityMapperStaticSchema<EntityMapperType>} - The JSON object.
     */
    static serializeEntityToJson<EntityMapperType extends ResponseEntityMapper<unknown, any>>(this: EntityMapperConstructor<EntityMapperType, EntityMapperType['_SV']>, schemaValidator: EntityMapperType['_SV'], entity: EntityMapperType['_Entity']): EntityMapperStaticSchema<EntityMapperType> {
        return construct(this, schemaValidator).serializeEntityToJson(entity) as EntityMapperStaticSchema<EntityMapperType>;
    }
}
