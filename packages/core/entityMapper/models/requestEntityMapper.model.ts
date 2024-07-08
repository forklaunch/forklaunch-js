import { AnySchemaValidator } from "@forklaunch/validator";
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
export abstract class RequestEntityMapper<Entity extends BaseEntity, SV extends AnySchemaValidator> extends BaseEntityMapper<SV> {
    /**
     * The entity.
     * @type {Entity}
     * @protected
     */
    _Entity!: Entity;

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
     * @template T - A type that extends RequestEntityMapper.
     * @param {EntityMapperConstructor<T>} this - The constructor of the T.
     * @param {T['_SV']} schemaValidator - The schema provider.
     * @param {T['_dto']} json - The JSON object.
     * @returns {T} - An instance of the T.
     */
    static fromJson<T extends RequestEntityMapper<BaseEntity, SV>, SV extends AnySchemaValidator, JsonType extends T['_dto']>(this: EntityMapperConstructor<T, SV>, schemaValidator: SV, json: JsonType): T {
        return construct(this, schemaValidator).fromJson(json);
    }

    /**
     * Deserializes a JSON object to an entity.
     *
     * @template T - A type that extends RequestEntityMapper.
     * @param {EntityMapperConstructor<T>} this - The constructor of the T.
     * @param {T['_SV']} schemaValidator - The schema provider.
     * @param {T['_dto']} json - The JSON object.
     * @param {...unknown[]} additionalArgs - Additional arguments.
     * @returns {T['_Entity']} - The entity.
     */
    static deserializeJsonToEntity<T extends RequestEntityMapper<BaseEntity, SV>, SV extends AnySchemaValidator, JsonType extends T['_dto']>(this: EntityMapperConstructor<T, SV>, schemaValidator: SV, json: JsonType, ...additionalArgs: unknown[]): T['_Entity'] {
        return construct(this, schemaValidator).fromJson(json).toEntity(...additionalArgs);
    }
}
