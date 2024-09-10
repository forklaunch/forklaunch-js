export interface PathBasedHandler<RouterHandler> {
  (path: string, ...handlers: RouterHandler[]): unknown;
}

export interface PathOrMiddlewareBasedHandler<RouterHandler>
  extends PathBasedHandler<RouterHandler> {
  (...args: RouterHandler[]): unknown;
}

export interface NestableRouterBasedHandler<RouterHandler, Router>
  extends PathOrMiddlewareBasedHandler<RouterHandler> {
  (...args: Router[]): unknown;
  (path: string, ...handlers: Router[]): unknown;
}

export interface ExpressLikeRouter<RouterHandler, Router> {
  // use: PathOrMiddlewareBasedHandler<RouterHandler>;
  use: NestableRouterBasedHandler<RouterHandler, Router>;
  all: PathOrMiddlewareBasedHandler<RouterHandler>;
  // any: PathOrMiddlewareBasedHandler<RouterHandler>;
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
