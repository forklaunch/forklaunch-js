import { AnySchemaValidator, Schema, SchemaValidator } from "@forklaunch/validator";
import { EntityMapperConstructor } from "../interfaces/entityMapper.interface";
import { EntityMapperSchemaValidatorObject } from "../types/entityMapper.types";

/**
 * Constructs an instance of a T.
 *
 * @template T - A type that extends BaseEntityMapper.
 * @param {EntityMapperConstructor<T>} self - The constructor of the T.
 * @param {...any[]} args - The arguments to pass to the constructor.
 * @returns {T} - An instance of the T.
 */
export function construct<T, SV extends AnySchemaValidator>(self: EntityMapperConstructor<T, SV>, schemaValidator?: SV): T {
    return new self(schemaValidator || {} as SV);
}

/**
 * Abstract class representing a base entityMapper.
 *
 * @template SV - A type that extends SchemaValidator.
 */
export abstract class BaseEntityMapper<SV extends AnySchemaValidator> {
    /**
    * The schema validator exact type.
    * @type {SV}
    * @protected
    */
    _SV!: SV;

    /**
     * The schema validator as a general type.
     * @type {SchemaValidator}
     * @protected
     */
    protected schemaValidator: SchemaValidator;

    /**
     * The schema definition.
     * @type {EntityMapperSchemaValidatorObject<SV>}
     * @abstract
     */
    abstract schema: EntityMapperSchemaValidatorObject<SV>;

    /**
     * The Data Transfer Object (DTO).
     * @type {Schema<this['schema'], SV>}
     *
     */
    _dto: Schema<this['schema'], SV> = {} as unknown as Schema<this['schema'], SV>;

    /**
     * Creates an instance of BaseEntityMapper.
     * 
     * @param {SV} schemaValidator - The schema provider.
     */
    constructor(schemaValidator: SV) {
        this.schemaValidator = schemaValidator as unknown as SchemaValidator;
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
        this._dto = _dto as unknown as Schema<this['schema'], SV>;
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
     * Gets the schema of a T.
     * 
     * @template T - A type that extends BaseEntityMapper.
     * @param {EntityMapperConstructor<T>} this - The constructor of the T.
     * @returns {T['schema']} - The schema of the T.
     */
    static schema<T extends BaseEntityMapper<SV>, SV extends AnySchemaValidator>(this: EntityMapperConstructor<T, SV>): T['schema'] {
        return construct(this).schema;
    }
}