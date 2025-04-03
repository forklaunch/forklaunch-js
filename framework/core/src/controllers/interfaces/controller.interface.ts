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
