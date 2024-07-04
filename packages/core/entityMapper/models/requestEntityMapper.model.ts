import { SchemaValidator } from "@forklaunch/validator/interfaces";
import { BaseEntity } from "../../database/mikro/models/entities/base.entity";
import { EntityMapperConstructor } from "../interfaces/entityMapper.interface";
import { BaseEntityMapper, construct } from "./baseEntityMapper.model";

/**
 * Abstract class representing a request entityMapper.
 *
 * @template Entity - A type that extends BaseEntity.
 * @template SV - A type that extends SchemaValidator.
 * @extends {BaseEntityMapper<SV>}
 */
export abstract class RequestEntityMapper<Entity extends BaseEntity | unknown, SV extends SchemaValidator> extends BaseEntityMapper<SV> {
    /**
     * The entity.
     * @type {Entity}
     * @protected
     */
    _Entity!: Entity;
    
    /**
     * Creates an instance of RequestEntityMapper.
     * 
     * @param {SV} schemaValidator - The schema provider.
     */
    constructor(schemaValidator: SV) {
        super(schemaValidator);
    }

    /**
     * Converts the underlying DTO to an entity.
     *
     * @abstract
     * @param {...unknown[]} additionalArgs - Additional arguments.
     * @returns {Entity} - The entity.
     */
    abstract toEntity(...additionalArgs: unknown[]): Entity;

    /**
     * Populates the DTO with data from a JSON object.
     *
     * @param {this['_dto']} json - The JSON object.
     * @returns {this} - The instance of the RequestEntityMapper.
     */
    fromJson(json: this['_dto']): this {
        if (!this.schemaValidator.validate(this.schemaValidator.schemify(this.schema), json)) {
            throw new Error('Invalid DTO');
        }
        this.dto = json;
        return this;
    }

    /**
     * Deserializes a JSON object to an entity.
     *
     * @param {this['_dto']} json - The JSON object.
     * @param {...unknown[]} additionalArgs - Additional arguments.
     * @returns {Entity} - The entity.
     */
    deserializeJsonToEntity(json: this['_dto'], ...additionalArgs: unknown[]): Entity {
        return this.fromJson(json).toEntity(...additionalArgs);
    }

    /**
     * Creates an instance of a RequestEntityMapper from a JSON object.
     *
     * @template EntityMapperType - A type that extends RequestEntityMapper.
     * @param {EntityMapperConstructor<EntityMapperType>} this - The constructor of the EntityMapperType.
     * @param {EntityMapperType['_SV']} schemaValidator - The schema provider.
     * @param {EntityMapperType['_dto']} json - The JSON object.
     * @returns {EntityMapperType} - An instance of the EntityMapperType.
     */
    static fromJson<EntityMapperType extends RequestEntityMapper<unknown, any>>(this: EntityMapperConstructor<EntityMapperType, EntityMapperType['_SV']>, schemaValidator: EntityMapperType['_SV'], json: EntityMapperType['_dto']): EntityMapperType {
        return construct(this, schemaValidator).fromJson(json as unknown as EntityMapperType['_dto']);
    }

    /**
     * Deserializes a JSON object to an entity.
     *
     * @template EntityMapperType - A type that extends RequestEntityMapper.
     * @param {EntityMapperConstructor<EntityMapperType>} this - The constructor of the EntityMapperType.
     * @param {EntityMapperType['_SV']} schemaValidator - The schema provider.
     * @param {EntityMapperType['_dto']} json - The JSON object.
     * @param {...unknown[]} additionalArgs - Additional arguments.
     * @returns {EntityMapperType['_Entity']} - The entity.
     */
    static deserializeJsonToEntity<EntityMapperType extends RequestEntityMapper<unknown, any>>(this: EntityMapperConstructor<EntityMapperType, EntityMapperType['_SV']>, schemaValidator: EntityMapperType['_SV'], json: EntityMapperType['_dto'], ...additionalArgs: unknown[]): EntityMapperType['_Entity'] {
        return construct(this, schemaValidator).fromJson(json as EntityMapperType['_dto']).toEntity(...additionalArgs);
    }
}
