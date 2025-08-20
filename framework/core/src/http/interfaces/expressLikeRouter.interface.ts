import { IncomingMessage, ServerOptions, ServerResponse } from 'node:http';

export interface PathBasedHandler<RouterHandler> {
  (path: string, ...handlers: RouterHandler[]): unknown;
}

export interface PathOrMiddlewareBasedHandler<RouterHandler>
  extends PathBasedHandler<RouterHandler> {
  (...args: RouterHandler[]): unknown;
}

export interface NestableRouterBasedHandler<RouterHandler, Router>
  extends PathOrMiddlewareBasedHandler<RouterHandler> {
  (...args: (Router | RouterHandler)[]): unknown;
  (path: string, ...handlers: (Router | RouterHandler)[]): unknown;
}

export interface ExpressLikeRouter<RouterHandler, Router>
  extends ServerOptions<typeof IncomingMessage, typeof ServerResponse> {
  use: NestableRouterBasedHandler<RouterHandler, Router>;
  all: PathOrMiddlewareBasedHandler<RouterHandler>;
  connect: PathOrMiddlewareBasedHandler<RouterHandler>;
  get: PathBasedHandler<RouterHandler>;
  post: PathBasedHandler<RouterHandler>;
  put: PathBasedHandler<RouterHandler>;
  patch: PathBasedHandler<RouterHandler>;
  delete: PathBasedHandler<RouterHandler>;
  options: PathBasedHandler<RouterHandler>;
  head: PathBasedHandler<RouterHandler>;
  trace: PathBasedHandler<RouterHandler>;
}
