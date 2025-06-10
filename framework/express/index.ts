import {
  DocsConfiguration,
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
import { BusboyConfig } from 'busboy';
import { CorsOptions } from 'cors';
import { Application } from './src/expressApplication';
import { Router } from './src/expressRouter';
import { checkout } from './src/handlers/checkout';
import { copy } from './src/handlers/copy';
import { delete_ } from './src/handlers/delete';
import { get } from './src/handlers/get';
import { head } from './src/handlers/head';
import { link } from './src/handlers/link';
import { lock } from './src/handlers/lock';
import { mSearch } from './src/handlers/m-search';
import { merge } from './src/handlers/merge';
import { middleware } from './src/handlers/middleware';
import { mkcActivity } from './src/handlers/mkcactivity';
import { mkcol } from './src/handlers/mkcol';
import { move } from './src/handlers/move';
import { notify } from './src/handlers/notify';
import { options } from './src/handlers/options';
import { patch } from './src/handlers/patch';
import { post } from './src/handlers/post';
import { propfind } from './src/handlers/propfind';
import { proppatch } from './src/handlers/proppatch';
import { purge } from './src/handlers/purge';
import { put } from './src/handlers/put';
import { report } from './src/handlers/report';
import { search } from './src/handlers/search';
import { subscribe } from './src/handlers/subscribe';
import { trace } from './src/handlers/trace';
import { unlink } from './src/handlers/unlink';
import { unlock } from './src/handlers/unlock';
import { unsubscribe } from './src/handlers/unsubscribe';

/**
 * Creates a new instance of Application with the given schema validator.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Application<SV>} - The new application instance.
 */
export function forklaunchExpress<SV extends AnySchemaValidator>(
  schemaValidator: SV,
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
  options?: {
    docs?: DocsConfiguration;
    busboy?: BusboyConfig;
    text?: OptionsText;
    json?: OptionsJson;
    urlencoded?: OptionsUrlencoded;
    cors?: CorsOptions;
  }
) {
  return new Application(schemaValidator, openTelemetryCollector, options);
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
>(
  basePath: BasePath,
  schemaValidator: SV,
  openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
  options?: {
    busboy?: BusboyConfig;
    text?: OptionsText;
    json?: OptionsJson;
    urlencoded?: OptionsUrlencoded;
  }
): Router<SV, BasePath> {
  const router = new Router(
    basePath,
    schemaValidator,
    openTelemetryCollector,
    options
  );
  return router;
}

export type { NextFunction, Request, Response } from 'express';
export type { Application } from './src/expressApplication';
export type { Router } from './src/expressRouter';

export const handlers: {
  checkout: typeof checkout;
  copy: typeof copy;
  delete: typeof delete_;
  get: typeof get;
  head: typeof head;
  link: typeof link;
  lock: typeof lock;
  mSearch: typeof mSearch;
  merge: typeof merge;
  middleware: typeof middleware;
  mkcActivity: typeof mkcActivity;
  mkcol: typeof mkcol;
  move: typeof move;
  notify: typeof notify;
  options: typeof options;
  patch: typeof patch;
  post: typeof post;
  propfind: typeof propfind;
  proppatch: typeof proppatch;
  purge: typeof purge;
  put: typeof put;
  report: typeof report;
  search: typeof search;
  subscribe: typeof subscribe;
  trace: typeof trace;
  unlink: typeof unlink;
  unlock: typeof unlock;
  unsubscribe: typeof unsubscribe;
} = {
  checkout,
  copy,
  delete: delete_,
  get,
  head,
  link,
  lock,
  mSearch,
  merge,
  middleware,
  mkcActivity,
  mkcol,
  move,
  notify,
  options,
  patch,
  post,
  propfind,
  proppatch,
  purge,
  put,
  report,
  search,
  subscribe,
  trace,
  unlink,
  unlock,
  unsubscribe
};
