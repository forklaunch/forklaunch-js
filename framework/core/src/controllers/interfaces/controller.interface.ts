/**
 * Generic interface for a controller that wraps a service.
 *
 * @template Service - The service type that this controller wraps
 * @template BaseRequest - The base request type (typically Express.Request)
 * @template BaseResponse - The base response type (typically Express.Response)
 * @template NextFunction - The next function type (typically Express.NextFunction)
 * @template ParsedQs - The parsed query string type
 *
 */
export type Controller<
  Service,
  BaseRequest,
  BaseResponse,
  NextFunction,
  ParsedQs
> = {
  [K in keyof Service]: unknown;
} & {
  readonly __request?: BaseRequest;
  readonly __response?: BaseResponse;
  readonly __next?: NextFunction;
  readonly __qs?: ParsedQs;
} & {
  [K: string]: unknown;
};
