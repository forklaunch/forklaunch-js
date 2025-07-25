import {
  AnySchemaValidator,
  prettyPrintParseErrors,
  Schema,
  SchemaValidator
} from '@forklaunch/validator';
import { MapperSchemaValidatorObject } from '../../../../internal/src/types/mappers.types';
import { MapperConstructor } from '../interfaces/mappers.interface';

/**
 * Constructs an instance of a T.
 *
 * @template T - A type that extends BaseMapper.
 * @template SV - A type that extends AnySchemaValidator.
 * @param {MapperConstructor<T, SV>} self - The constructor of the T.
 * @param {SV} [schemaValidator] - The optional schema validator.
 * @returns {T} - An instance of the T.
 */
export function construct<T, SV extends AnySchemaValidator>(
  self: MapperConstructor<T, SV>,
  schemaValidator?: SV
): T {
  return new self(schemaValidator || ({} as SV));
}

/**
 * Abstract class representing a base entity mapper.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export abstract class BaseMapper<SV extends AnySchemaValidator> {
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
   * @type {MapperSchemaValidatorObject<SV>}
   * @abstract
   */
  abstract schema: MapperSchemaValidatorObject<SV>;

  /**
   * The Data Transfer Object (DTO).
   * @type {Schema<this['schema'], SV>}
   */
  _dto!: Schema<this['schema'], SV>;

  /**
   * Creates an instance of BaseMapper.
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
    const parsedSchema = this.schemaValidator.parse(
      this.schemaValidator.schemify(this.schema),
      _dto
    );
    if (!parsedSchema.ok) {
      throw new Error(prettyPrintParseErrors(parsedSchema.errors, 'DTO'));
    }
    this._dto = _dto as unknown as Schema<this['schema'], SV>;
  }

  /**
   * Validates and gets the Data Transfer Object (DTO).
   *
   * @returns {this['_dto']} - The Data Transfer Object (DTO).
   */
  get dto(): this['_dto'] {
    return this._dto as unknown as this['_dto'];
  }

  /**
   * Gets the schema of a T.
   *
   * @template T - A type that extends BaseMapper.
   * @template SV - A type that extends AnySchemaValidator.
   * @param {MapperConstructor<T, SV>} this - The constructor of the T.
   * @returns {T['schema']} - The schema of the T.
   */
  static schema<T extends BaseMapper<SV>, SV extends AnySchemaValidator>(
    this: MapperConstructor<T, SV>
  ): T['schema'] {
    return construct(this).schema;
  }
}
