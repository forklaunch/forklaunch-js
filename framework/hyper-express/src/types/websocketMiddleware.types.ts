import {
  Body,
  ExpressLikeSchemaHandler,
  HeadersObject,
  MiddlewareContractDetails,
  ParamsObject,
  PathMatch,
  QueryObject,
  ResolvedSessionObject,
  ResponsesObject,
  SchemaAuthMethods,
  SessionObject,
  StringOnlyObject,
  TypedHandler,
  VersionSchema
} from '@forklaunch/core/http';
import { AnySchemaValidator, Schema } from '@forklaunch/validator';

type WebSocketUpgradeContext<
  SV extends AnySchemaValidator,
  BaseResponse,
  Upgrade extends StringOnlyObject<SV>
> = Omit<BaseResponse, 'upgrade'> & {
  upgrade: (
    context: Upgrade extends infer U
      ? U extends StringOnlyObject<SV>
        ? Schema<U, SV>
        : U
      : never
  ) => void;
};

export type WebSocketContractDetails<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  VersionedApi extends VersionSchema<SV, 'middleware'>,
  BaseRequest,
  Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    BaseRequest
  >,
  Upgrade extends StringOnlyObject<SV>
> = MiddlewareContractDetails<
  SV,
  Name,
  Path,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  VersionedApi,
  BaseRequest,
  Auth
> & {
  upgrade?: Upgrade;
};

export type WebSocketTypedHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  VersionedApi extends VersionSchema<SV, 'middleware'>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    BaseRequest
  >,
  Upgrade extends StringOnlyObject<SV>
> = Omit<
  TypedHandler<
    SV,
    Name,
    'middleware',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    VersionedApi,
    BaseRequest,
    WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
    NextFunction,
    Auth
  >,
  'contractDetails' | 'handlers'
> & {
  contractDetails: WebSocketContractDetails<
    SV,
    Name,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    VersionedApi,
    BaseRequest,
    Auth,
    Upgrade
  >;
  handlers: ExpressLikeSchemaHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    VersionedApi,
    ResolvedSessionObject<SV, Auth, SessionObject<SV>>,
    BaseRequest,
    WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
    NextFunction
  >[];
};

export type WebSocketContractDetailsOrMiddlewareOrTypedHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  VersionedApi extends VersionSchema<SV, 'middleware'>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  BaseSession extends SessionObject<SV>,
  Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    BaseRequest
  >,
  Upgrade extends StringOnlyObject<SV>
> =
  | WebSocketContractDetails<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      VersionedApi,
      BaseRequest,
      Auth,
      Upgrade
    >
  | WebSocketTypedHandler<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth,
      Upgrade
    >
  | ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, BaseSession>,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >;

export type WebSocketMiddlewareOrMiddlewareWithTypedHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  VersionedApi extends VersionSchema<SV, 'middleware'>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  BaseSession extends SessionObject<SV>,
  Auth extends SchemaAuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedApi,
    BaseRequest
  >,
  Upgrade extends StringOnlyObject<SV>
> =
  | ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, BaseSession>,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >
  | WebSocketTypedHandler<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      BaseRequest,
      BaseResponse,
      NextFunction,
      Auth,
      Upgrade
    >;

export interface TypedWebSocketMiddlewareDefinition<
  ChainableRouter,
  SV extends AnySchemaValidator,
  Session extends SessionObject<SV>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  RouterHandler
> {
  <
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, 'middleware'>,
    SessionSchema extends SessionObject<SV>,
    Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >,
    Upgrade extends StringOnlyObject<SV>
  >(
    path: Path,
    contractDetails: WebSocketContractDetails<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      VersionedApi,
      BaseRequest,
      Auth,
      Upgrade
    >,
    middleware: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, Session>,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >,
    ...middlewares: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      SessionSchema,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >[]
  ): ChainableRouter;

  <
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, 'middleware'>,
    Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >,
    Upgrade extends StringOnlyObject<SV>
  >(
    contractDetails: WebSocketContractDetails<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      VersionedApi,
      BaseRequest,
      Auth,
      Upgrade
    >,
    middleware: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, Session>,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >,
    ...middlewares: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, Session>,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >[]
  ): ChainableRouter;

  (
    middleware: RouterHandler,
    ...otherMiddleware: RouterHandler[]
  ): ChainableRouter;

  <
    Name extends string,
    Path extends `/${string}`,
    SuppliedPath extends Path,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, 'middleware'>,
    Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >,
    Upgrade extends StringOnlyObject<SV>
  >(
    path: PathMatch<SuppliedPath, Path>,
    middleware: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, Session>,
      BaseRequest,
      WebSocketUpgradeContext<SV, BaseResponse, Upgrade>,
      NextFunction
    >,
    ...middlewareAndTypedHandler: [
      ...ExpressLikeSchemaHandler<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        VersionedApi,
        ResolvedSessionObject<SV, Auth, Session>,
        BaseRequest,
        Omit<BaseResponse, 'upgrade'> & {
          upgrade: (context: Schema<Upgrade, SV>) => void;
        },
        NextFunction
      >[],
      WebSocketTypedHandler<
        SV,
        Name,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        VersionedApi,
        BaseRequest,
        Omit<BaseResponse, 'upgrade'> & {
          upgrade: (context: Schema<Upgrade, SV>) => void;
        },
        NextFunction,
        Auth,
        Upgrade
      >
    ]
  ): ChainableRouter;

  <
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, 'middleware'>,
    Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >,
    Upgrade extends StringOnlyObject<SV>
  >(
    middleware: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      ResolvedSessionObject<SV, Auth, Session>,
      BaseRequest,
      Omit<BaseResponse, 'upgrade'> & {
        upgrade: (context: Schema<Upgrade, SV>) => void;
      },
      NextFunction
    >,
    ...middlewareAndTypedHandler: [
      ...ExpressLikeSchemaHandler<
        SV,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        VersionedApi,
        ResolvedSessionObject<SV, Auth, Session>,
        BaseRequest,
        Omit<BaseResponse, 'upgrade'> & {
          upgrade: (context: Schema<Upgrade, SV>) => void;
        },
        NextFunction
      >[],
      WebSocketTypedHandler<
        SV,
        Name,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        VersionedApi,
        BaseRequest,
        Omit<BaseResponse, 'upgrade'> & {
          upgrade: (context: Schema<Upgrade, SV>) => void;
        },
        NextFunction,
        Auth,
        Upgrade
      >
    ]
  ): ChainableRouter;

  //   TypedHandler overloads moved to the end
  <
    Name extends string,
    Path extends `/${string}`,
    SuppliedPath extends Path,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, 'middleware'>,
    Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >,
    Upgrade extends StringOnlyObject<SV>
  >(
    path: PathMatch<SuppliedPath, Path>,
    typedHandler: WebSocketTypedHandler<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      BaseRequest,
      Omit<BaseResponse, 'upgrade'> & {
        upgrade: (context: Schema<Upgrade, SV>) => void;
      },
      NextFunction,
      Auth,
      Upgrade
    >
  ): ChainableRouter;

  <
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>,
    VersionedApi extends VersionSchema<SV, 'middleware'>,
    Auth extends SchemaAuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedApi,
      BaseRequest
    >,
    Upgrade extends StringOnlyObject<SV>
  >(
    typedHandler: WebSocketTypedHandler<
      SV,
      Name,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      VersionedApi,
      BaseRequest,
      Omit<BaseResponse, 'upgrade'> & {
        upgrade: (context: Schema<Upgrade, SV>) => void;
      },
      NextFunction,
      Auth,
      Upgrade
    >
  ): ChainableRouter;
}
