/**
 * Sourced directly from @forklaunch/validator/zod and @forklaunch/express —
 * the actual origin of these constructs — instead of the app-level
 * @forklaunch/blueprint-core aggregator. blueprint/core/registrations.ts has
 * a pre-existing bug (a type-only import written as a value import) that
 * crashes anything loaded via tsx-on-source, including the shipped billing
 * module. This file lets ecommerce-stripe run without depending on that fix.
 */
import {
  array,
  SchemaValidator as SchemaValidatorFactory,
  string
} from '@forklaunch/validator/zod';

export {
  array,
  boolean,
  date,
  enum_,
  number,
  optional,
  record,
  string,
  uuid
} from '@forklaunch/validator/zod';
export {
  forklaunchExpress,
  forklaunchRouter,
  handlers
} from '@forklaunch/express';
export { PERMISSIONS, ROLES } from '../core/auth/rbac';

export const schemaValidator = SchemaValidatorFactory();
export type SchemaValidator = ReturnType<typeof SchemaValidatorFactory>;

export const IdSchema = { id: string };
export const IdsSchema = { ids: array(string) };
