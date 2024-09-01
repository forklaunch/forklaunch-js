import { Method } from '../types/contractDetails.types';

type MethodKeys = {
  [Key in Method]: unknown;
};

export interface ExpressLikeRouter<RouterFunction> extends MethodKeys {
  use(...args: RouterFunction[]): this;
  all(...args: RouterFunction[]): this;
  any(...args: RouterFunction[]): this;
  connect(...args: RouterFunction[]): this;
  get(path: string, ...handlers: RouterFunction[]): unknown;
  post(path: string, ...handlers: RouterFunction[]): unknown;
  put(path: string, ...handlers: RouterFunction[]): unknown;
  patch(path: string, ...handlers: RouterFunction[]): unknown;
  delete(path: string, ...handlers: RouterFunction[]): unknown;
  options(path: string, ...handlers: RouterFunction[]): unknown;
  head(path: string, ...handlers: RouterFunction[]): unknown;
  trace(path: string, ...handlers: RouterFunction[]): unknown;
}
