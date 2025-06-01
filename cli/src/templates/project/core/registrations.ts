// used for aligning exports across the monorepo
import {
  SchemaValidator,
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
  string,
  symbol,
  undefined_,
  union,
  unknown,
  uri,
  uuid,
  void_,
} from "@forklaunch/validator/{{validator}}";
import {
  forklaunchExpress,
  forklaunchRouter,
  handlers,
} from "@forklaunch/{{http_framework}}";

export type SchemaValidator = ReturnType<typeof SchemaValidator>;

export {
  SchemaValidator,
  any,
  array,
  bigint,
  binary,
  boolean,
  date,
  email,
  enum_,
  file,
  forklaunchExpress,
  forklaunchRouter,
  function_,
  handlers,
  literal,
  never,
  null_,
  nullish,
  number,
  optional,
  promise,
  record,
  string,
  symbol,
  undefined_,
  union,
  unknown,
  uri,
  uuid,
  void_,
};

export const IdSchema = {
  id: string,
};
export const IdsSchema = {
  ids: array(string),
};
