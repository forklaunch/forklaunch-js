import { AnySchemaValidator } from '@forklaunch/validator';
import { any } from './src/handlers/any';
import { delete_ } from './src/handlers/delete';
import { get } from './src/handlers/get';
import { head } from './src/handlers/head';
import { middleware } from './src/handlers/middleware';
import { options } from './src/handlers/options';
import { patch } from './src/handlers/patch';
import { post } from './src/handlers/post';
import { put } from './src/handlers/put';
import { trace } from './src/handlers/trace';
import { Application } from './src/hyperExpressApplication';
import { Router } from './src/hyperExpressRouter';

export type App<SV extends AnySchemaValidator> = Application<SV>;

/**
 * Creates a new instance of Application with the given schema validator.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Application<SV>} - The new application instance.
 */
export function forklaunchExpress<SV extends AnySchemaValidator>(
  schemaValidator: SV
) {
  return new Application(schemaValidator);
}

/**
 * Creates a new instance of Router with the given base path and schema validator.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {string} basePath - The base path for the router.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Router<SV>} - The new router instance.
 */
export function forklaunchRouter<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`
>(basePath: BasePath, schemaValidator: SV): Router<SV, BasePath> {
  const router = new Router(basePath, schemaValidator);
  return router;
}

export type {
  MiddlewareNext as NextFunction,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
export type { ParsedQs } from 'qs';
export type { Application } from './src/hyperExpressApplication';
export type { Router } from './src/hyperExpressRouter';
export const handlers = {
  any,
  delete: delete_,
  get,
  head,
  middleware,
  options,
  patch,
  post,
  put,
  trace
};
