import {
  forklaunchExpress as registeredForklaunchExpress,
  forklaunchRouter as registeredForklaunchRouter
} from '@forklaunch/hyper-express';

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

export const string = schemaString;
export const uuid = schemaUuid;
export const uri = schemaUri;
export const email = schemaEmail;
export const number = schemaNumber;
export const bigint = schemaBigint;
export const boolean = schemaBoolean;
export const date = schemaDate;
export const symbol = schemaSymbol;
export const nullish = schemaNullish;
export const any = schemaAny;
export const unknown = schemaUnknown;
export const never = schemaNever;
export const optional = schemaOptional;
export const array = schemaArray;
export const union = schemaUnion;
export const literal = schemaLiteral;
export const enum_ = schemaEnum;
