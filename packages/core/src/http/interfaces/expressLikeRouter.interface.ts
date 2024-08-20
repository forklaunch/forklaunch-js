export interface ExpressLikeRouter<RouterFunction> {
  use(...args: RouterFunction[]): this;
  get(path: string, ...handlers: RouterFunction[]): void;
  post(path: string, ...handlers: RouterFunction[]): void;
  put(path: string, ...handlers: RouterFunction[]): void;
  patch(path: string, ...handlers: RouterFunction[]): void;
  delete(path: string, ...handlers: RouterFunction[]): void;
}
