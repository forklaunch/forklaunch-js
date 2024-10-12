// When generating, generate one of each flavor, depending on configuration, and this file should be generated

import {
  forklaunchExpress as registeredForklaunchExpress,
  forklaunchRouter as registeredForklaunchRouter
} from '@forklaunch/express';
// import { forklaunchRouter as registeredForklaunchRouter, forklaunchExpress as registeredForklaunchExpress } from '@forklaunch/hyper-express';

// import {
//   SchemaValidator as RegisteredSchemaValidator,
//   any as schemaAny,
//   array as schemaArray,
//   bigint as schemaBigint,
//   boolean as schemaBoolean,
//   date as schemaDate,
//   email as schemaEmail,
//   literal as schemaLiteral,
//   never as schemaNever,
//   nullish as schemaNullish,
//   number as schemaNumber,
//   optional as schemaOptional,
//   string as schemaString,
//   symbol as schemaSymbol,
//   union as schemaUnion,
//   unknown as schemaUnknown,
//   uri as schemaUri,
//   uuid as schemaUuid
// } from '@forklaunch/validator/typebox';
import {
  SchemaValidator as RegisteredSchemaValidator,
  any as schemaAny,
  array as schemaArray,
  bigint as schemaBigint,
  boolean as schemaBoolean,
  date as schemaDate,
  email as schemaEmail,
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
export const forklaunchRouter = (basePath: `/${string}`) =>
  registeredForklaunchRouter(basePath, SchemaValidator());
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