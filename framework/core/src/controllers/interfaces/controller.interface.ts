export type Controller<
  Service extends { SchemaDefinition: unknown },
  BaseRequest,
  BaseResponse,
  NextFunction,
  ParsedQs
> = {
  [K in keyof Omit<Service, 'SchemaDefinition'>]: unknown;
} & {
  readonly __request?: BaseRequest;
  readonly __response?: BaseResponse;
  readonly __next?: NextFunction;
  readonly __qs?: ParsedQs;
};
