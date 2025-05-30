import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  NextFunction,
  ParsedQs,
  forklaunchExpress as registeredForklaunchExpress,
  forklaunchRouter as registeredForklaunchRouter,
  handlers as registeredHandlers,
  Request,
  Response
} from '@forklaunch/express';
import {
  IdiomaticSchema,
  Schema,
  UnboxedObjectSchema
} from '@forklaunch/validator';
import {
  SchemaValidator as RegisteredSchemaValidator,
  any as schemaAny,
  array as schemaArray,
  bigint as schemaBigint,
  boolean as schemaBoolean,
  date as schemaDate,
  email as schemaEmail,
  enum_ as schemaEnum,
  function_ as schemaFunction,
  literal as schemaLiteral,
  never as schemaNever,
  null_ as schemaNull,
  nullish as schemaNullish,
  number as schemaNumber,
  optional as schemaOptional,
  promise as schemaPromise,
  record as schemaRecord,
  string as schemaString,
  symbol as schemaSymbol,
  undefined_ as schemaUndefined,
  union as schemaUnion,
  unknown as schemaUnknown,
  uri as schemaUri,
  uuid as schemaUuid,
  void_ as schemaVoid
} from '@forklaunch/validator/zod';

export type { NextFunction, ParsedQs, Request, Response };
export type SchemaValidator = ReturnType<typeof RegisteredSchemaValidator>;
export type SchemaType<T extends IdiomaticSchema<SchemaValidator>> = Schema<
  T,
  SchemaValidator
>;
export type BaseDtoParameters<T extends UnboxedObjectSchema<SchemaValidator>> =
  Schema<T, SchemaValidator>;

export const SchemaValidator = RegisteredSchemaValidator;
export const forklaunchRouter = <BasePath extends `/${string}`>(
  basePath: BasePath,
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>
) =>
  registeredForklaunchRouter(
    basePath,
    SchemaValidator(),
    openTelemetryCollector
  );
export const forklaunchExpress = (
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
  options?: Parameters<typeof registeredForklaunchExpress>[2]
) =>
  registeredForklaunchExpress(
    SchemaValidator(),
    openTelemetryCollector,
    options
  );

export const handlers: typeof registeredHandlers = registeredHandlers;

export const string: typeof schemaString = schemaString;
export const uuid: typeof schemaUuid = schemaUuid;
export const uri: typeof schemaUri = schemaUri;
export const email: typeof schemaEmail = schemaEmail;
export const number: typeof schemaNumber = schemaNumber;
export const bigint: typeof schemaBigint = schemaBigint;
export const boolean: typeof schemaBoolean = schemaBoolean;
export const date: typeof schemaDate = schemaDate;
export const symbol: typeof schemaSymbol = schemaSymbol;
export const nullish: typeof schemaNullish = schemaNullish;
export const undefined_: typeof schemaUndefined = schemaUndefined;
export const null_: typeof schemaNull = schemaNull;
export const void_: typeof schemaVoid = schemaVoid;
export const any: typeof schemaAny = schemaAny;
export const unknown: typeof schemaUnknown = schemaUnknown;
export const never: typeof schemaNever = schemaNever;
export const optional: typeof schemaOptional = schemaOptional;
export const array: typeof schemaArray = schemaArray;
export const union: typeof schemaUnion = schemaUnion;
export const literal: typeof schemaLiteral = schemaLiteral;
export const enum_: typeof schemaEnum = schemaEnum;
export const function_: typeof schemaFunction = schemaFunction;
export const record: typeof schemaRecord = schemaRecord;
export const promise: typeof schemaPromise = schemaPromise;

export const IdSchema = {
  id: string
};
export const IdsSchema = {
  ids: array(string)
};
