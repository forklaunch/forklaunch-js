import { SchemaValidator } from "@forklaunch/validator/interfaces";
import { EntityMapperConstructor } from "../interfaces/entityMapper.interface";
import { EntityMapperSchema, EntityMapperSchemaValidatorObject } from "../types/entityMapper.types";

/**
 * Constructs an instance of a EntityMapperType.
 *
 * @template EntityMapperType - A type that extends BaseEntityMapper.
 * @param {EntityMapperConstructor<EntityMapperType>} self - The constructor of the EntityMapperType.
 * @param {...any[]} args - The arguments to pass to the constructor.
 * @returns {EntityMapperType} - An instance of the EntityMapperType.
 */
export function construct<EntityMapperType, SV extends SchemaValidator>(self: EntityMapperConstructor<EntityMapperType, SV>, schemaValidator?: SV): EntityMapperType {
    return new self(schemaValidator || {} as SV);
}

/**
 * Abstract class representing a base entityMapper.
 *
 * @template SV - A type that extends SchemaValidator.
 */
export abstract class BaseEntityMapper<SV extends SchemaValidator> {
     /**
     * The schema validator.
     * @type {SV}
     * @protected
     */
    _SV!: SV;

    /**
     * The schema provider.
     * @type {SV}
     * @protected
     */
    protected schemaValidator: SV;

    /**
     * The schema definition.
     * @type {EntityMapperSchemaValidatorObject<SV>}
     * @abstract
     */
    abstract schema: EntityMapperSchemaValidatorObject<SV>;

    /**
     * The Data Transfer Object (DTO).
     * @type {EntityMapperSchema<this['schema'], SV>}
     *
     */
    _dto: EntityMapperSchema<this['schema'], SV> = {} as unknown as EntityMapperSchema<this['schema'], SV>;

    /**
     * Creates an instance of BaseEntityMapper.
     * 
     * @param {SV} schemaValidator - The schema provider.
     */
    constructor(schemaValidator: SV) {
        this.schemaValidator = schemaValidator;
    }

    /**
     * Validates and sets the Data Transfer Object (DTO).
     * 
     * @param {this['_dto']} dto - The Data Transfer Object (DTO).
     * @throws {Error} - Throws an error if the DTO is invalid.
     */
    set dto(_dto: this['_dto']) {
        if (!this.schemaValidator.validate(this.schemaValidator.schemify(this.schema), _dto)) {
            throw new Error('Invalid DTO');
        }
        this._dto = _dto as unknown as EntityMapperSchema<this['schema'], SV>;
    }

    /**
     * Validates and gets the Data Transfer Object (DTO).
     * 
     * @returns {this['_dto']} - The Data Transfer Object (DTO).
     * @throws {Error} - Throws an error if the DTO is invalid.
     */
    get dto(): this['_dto'] {
        return this._dto as unknown as this['_dto'];
    }

    /**
     * Gets the schema of a EntityMapperType.
     * 
     * @template EntityMapperType - A type that extends BaseEntityMapper.
     * @param {EntityMapperConstructor<EntityMapperType>} this - The constructor of the EntityMapperType.
     * @returns {EntityMapperType['schema']} - The schema of the EntityMapperType.
     */
    static schema<EntityMapperType extends BaseEntityMapper<any>>(this: EntityMapperConstructor<EntityMapperType, EntityMapperType['_SV']>): EntityMapperType['schema'] {
        return construct(this).schema;
    }
}