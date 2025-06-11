import {
  ExpressOptions,
  forklaunchExpress,
  forklaunchRouter,
  handlers,
  NextFunction,
  Request,
  Response
} from '@forklaunch/express';
import {
  any,
  array,
  bigint,
  binary,
  boolean,
  date,
  email,
  enum_,
  file,
  function_,
  literal,
  never,
  null_,
  nullish,
  number,
  optional,
  promise,
  record,
  SchemaValidator,
  string,
  symbol,
  type,
  undefined_,
  union,
  unknown,
  uri,
  uuid,
  void_
} from '@forklaunch/validator/zod';

export type SchemaValidator = ReturnType<typeof SchemaValidator>;

export {
  any,
  array,
  bigint,
  binary,
  boolean,
  date,
  email,
  enum_,
  ExpressOptions,
  file,
  forklaunchExpress,
  forklaunchRouter,
  function_,
  handlers,
  literal,
  never,
  NextFunction,
  null_,
  nullish,
  number,
  optional,
  promise,
  record,
  Request,
  Response,
  SchemaValidator,
  string,
  symbol,
  type,
  undefined_,
  union,
  unknown,
  uri,
  uuid,
  void_
};

export const IdSchema = {
  id: string
};
export const IdsSchema = {
  ids: array(string)
};
