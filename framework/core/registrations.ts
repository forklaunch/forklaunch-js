import {
  forklaunchExpress as registeredForklaunchExpress,
  forklaunchRouter as registeredForklaunchRouter
} from '@forklaunch/express';

import {
  SchemaValidator as RegisteredSchemaValidator,
  any as schemaAny,
  array as schemaArray,
  bigint as schemaBigint,
  boolean as schemaBoolean,
  date as schemaDate,
  email as schemaEmail,
  enum_ as schemaEnum,
  literal as schemaLiteral,
  never as schemaNever,
  nullish as schemaNullish,
  number as schemaNumber,
  optional as schemaOptional,
  string as schemaString,
  symbol as schemaSymbol,
  union as schemaUnion,
  unknown as schemaUnknown,
  uri as schemaUri,
  uuid as schemaUuid
} from '@forklaunch/validator/typebox';

export const SchemaValidator = RegisteredSchemaValidator;
export type SchemaValidator = ReturnType<typeof RegisteredSchemaValidator>;
export const forklaunchRouter = <BasePath extends `/${string}`>(
  basePath: BasePath
) => registeredForklaunchRouter(basePath, SchemaValidator());
export const forklaunchExpress = () =>
  registeredForklaunchExpress(SchemaValidator());

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
export const any: typeof schemaAny = schemaAny;
export const unknown: typeof schemaUnknown = schemaUnknown;
export const never: typeof schemaNever = schemaNever;
export const optional: typeof schemaOptional = schemaOptional;
export const array: typeof schemaArray = schemaArray;
export const union: typeof schemaUnion = schemaUnion;
export const literal: typeof schemaLiteral = schemaLiteral;
export const enum_: typeof schemaEnum = schemaEnum;
