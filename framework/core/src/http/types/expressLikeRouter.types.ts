import {
  Prettify,
  PrettyCamelCase,
  SanitizePathSlashes
} from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import {
  ExpressLikeSchemaHandler,
  LiveSdkFunction,
  LiveTypeFunction,
  PathMatch
} from './apiDefinition.types';
import {
  Body,
  ContractDetails,
  HeadersObject,
  Method,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from './contractDetails.types';
import { ConstrainedForklaunchRouter } from './router.types';
import { TypedHandler } from './typedHandler.types';

export interface LiveTypeRouteDefinition<
  SV extends AnySchemaValidator,
  BasePath extends `/${string}`,
  ContractMethod extends Method,
  RouterHandler,
  Internal extends ExpressLikeRouter<RouterHandler, Internal>,
  BaseRequest,
  BaseResponse,
  NextFunction,
  ChainableRouter extends {
    fetchMap: object;
    sdk: object;
  }
> {
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
    LocalsObj extends Record<string, unknown>
  >(
    path: PathMatch<SuppliedPath, Path>,
    typedHandler: TypedHandler<
      SV,
      Name,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] &
        Record<
          SanitizePathSlashes<`${BasePath}${Path}`>,
          LiveTypeFunction<
            SV,
            SanitizePathSlashes<`${BasePath}${Path}`>,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            ContractMethod
          >
        >
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] &
        Record<
          PrettyCamelCase<Name>,
          LiveSdkFunction<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders
          >
        >
    >;
  };

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
    LocalsObj extends Record<string, unknown>
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
      BaseRequest,
      BaseResponse,
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
        BaseRequest,
        BaseResponse,
        NextFunction
      >[],
      TypedHandler<
        SV,
        Name,
        ContractMethod,
        Path,
        P,
        ResBodyMap,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        ResHeaders,
        LocalsObj,
        BaseRequest,
        BaseResponse,
        NextFunction
      >
    ]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] &
        Record<
          SanitizePathSlashes<`${BasePath}${Path}`>,
          LiveTypeFunction<
            SV,
            SanitizePathSlashes<`${BasePath}${Path}`>,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            ContractMethod
          >
        >
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] &
        Record<
          PrettyCamelCase<Name>,
          LiveSdkFunction<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders
          >
        >
    >;
  };

  <
    Name extends string,
    Path extends `/${string}`,
    P extends ParamsObject<SV>,
    ResBodyMap extends ResponsesObject<SV>,
    ReqBody extends Body<SV>,
    ReqQuery extends QueryObject<SV>,
    ReqHeaders extends HeadersObject<SV>,
    ResHeaders extends HeadersObject<SV>,
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetails: ContractDetails<
      SV,
      Name,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      BaseRequest
    >,
    ...middleware: ExpressLikeSchemaHandler<
      SV,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >[]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] &
        Record<
          SanitizePathSlashes<`${BasePath}${Path}`>,
          LiveTypeFunction<
            SV,
            SanitizePathSlashes<`${BasePath}${Path}`>,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            ContractMethod
          >
        >
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] &
        Record<
          PrettyCamelCase<Name>,
          LiveSdkFunction<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders
          >
        >
    >;
  };
}

export interface TypedMiddlewareDefinition<
  ChainableRouter,
  SV extends AnySchemaValidator,
  BaseRequest,
  BaseResponse,
  NextFunction,
  RouterHandler
> {
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
    LocalsObj extends Record<string, unknown>
  >(
    path: PathMatch<SuppliedPath, Path>,
    typedHandler: TypedHandler<
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
      BaseRequest,
      BaseResponse,
      NextFunction
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
    LocalsObj extends Record<string, unknown>
  >(
    typedHandler: TypedHandler<
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
      BaseRequest,
      BaseResponse,
      NextFunction
    >
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
    LocalsObj extends Record<string, unknown>
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
      BaseRequest,
      BaseResponse,
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
        BaseRequest,
        BaseResponse,
        NextFunction
      >[],
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
        BaseRequest,
        BaseResponse,
        NextFunction
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
    LocalsObj extends Record<string, unknown>
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
      BaseRequest,
      BaseResponse,
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
        BaseRequest,
        BaseResponse,
        NextFunction
      >[],
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
        BaseRequest,
        BaseResponse,
        NextFunction
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
    LocalsObj extends Record<string, unknown>
  >(
    path: Path,
    contractDetails: ContractDetails<
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
      BaseRequest
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
      BaseRequest,
      BaseResponse,
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
      BaseRequest,
      BaseResponse,
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
    LocalsObj extends Record<string, unknown>
  >(
    contractDetails: ContractDetails<
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
      BaseRequest
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
      BaseRequest,
      BaseResponse,
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
      BaseRequest,
      BaseResponse,
      NextFunction
    >[]
  ): ChainableRouter;
}

export interface TypedNestableMiddlewareDefinition<
  ChainableRouter extends {
    fetchMap: object;
    basePath: `/${string}`;
    sdk: Record<string, unknown>;
  },
  RouterHandler,
  Internal extends ExpressLikeRouter<RouterHandler, Internal>,
  SV extends AnySchemaValidator,
  BaseRequest,
  BaseResponse,
  NextFunction
> extends TypedMiddlewareDefinition<
    ChainableRouter,
    SV,
    BaseRequest,
    BaseResponse,
    NextFunction,
    RouterHandler
  > {
  (
    middleware: RouterHandler,
    ...otherMiddleware: RouterHandler[]
  ): ChainableRouter;

  <Router extends ConstrainedForklaunchRouter<SV, RouterHandler>>(
    router: Router
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };

  <Router extends ConstrainedForklaunchRouter<SV, RouterHandler>>(
    middlewareOrRouter: RouterHandler | Router,
    ...otherMiddlewareOrRouters: [...(RouterHandler | Router)[]]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };

  <Router extends ConstrainedForklaunchRouter<SV, RouterHandler>>(
    path: Router['basePath'],
    router: Router
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };

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
    Router extends ConstrainedForklaunchRouter<SV, RouterHandler>
  >(
    path: `/${string}` extends Router['basePath']
      ? Path
      : PathMatch<Path, Router['basePath']>,
    middleware:
      | ExpressLikeSchemaHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    ...middlewareAndTypedHandler: [
      ...(
        | ExpressLikeSchemaHandler<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
          >
        | Router
      )[],
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
        BaseRequest,
        BaseResponse,
        NextFunction
      >
    ]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };

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
    Router extends ConstrainedForklaunchRouter<SV, RouterHandler>
  >(
    middleware:
      | ExpressLikeSchemaHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    ...middlewareAndTypedHandler: [
      ...(
        | ExpressLikeSchemaHandler<
            SV,
            P,
            ResBodyMap,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            ResHeaders,
            LocalsObj,
            BaseRequest,
            BaseResponse,
            NextFunction
          >
        | Router
      )[],
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
        BaseRequest,
        BaseResponse,
        NextFunction
      >
    ]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };

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
    Router extends ConstrainedForklaunchRouter<SV, RouterHandler>
  >(
    path: `/${string}` extends Router['basePath']
      ? Path
      : PathMatch<Path, Router['basePath']>,
    contractDetails: ContractDetails<
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
      BaseRequest
    >,
    middleware:
      | ExpressLikeSchemaHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    ...middlewares: (
      | ExpressLikeSchemaHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router
    )[]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };

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
    Router extends ConstrainedForklaunchRouter<SV, RouterHandler>
  >(
    contractDetails: ContractDetails<
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
      BaseRequest
    >,
    middleware:
      | ExpressLikeSchemaHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router,
    ...middlewares: (
      | ExpressLikeSchemaHandler<
          SV,
          P,
          ResBodyMap,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          ResHeaders,
          LocalsObj,
          BaseRequest,
          BaseResponse,
          NextFunction
        >
      | Router
    )[]
  ): ChainableRouter & {
    fetchMap: Prettify<
      ChainableRouter['fetchMap'] & {
        [Key in keyof Router['fetchMap'] as Key extends string
          ? SanitizePathSlashes<`${ChainableRouter['basePath']}${Key}`>
          : never]: Router['fetchMap'][Key];
      }
    >;
    sdk: Prettify<
      ChainableRouter['sdk'] & {
        [K in PrettyCamelCase<
          Router['sdkName'] extends string
            ? Router['sdkName']
            : Router['basePath']
        >]: Prettify<Router['sdk']>;
      }
    >;
  };
}

export type ContractDetailsOrMiddlewareOrTypedHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  ContractMethod extends Method,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  BaseRequest,
  BaseResponse,
  NextFunction
> =
  | ContractDetails<
      SV,
      Name,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      BaseRequest
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
      BaseRequest,
      BaseResponse,
      NextFunction
    >
  | TypedHandler<
      SV,
      Name,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >;

export type MiddlewareOrMiddlewareWithTypedHandler<
  SV extends AnySchemaValidator,
  Name extends string,
  ContractMethod extends Method,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  BaseRequest,
  BaseResponse,
  NextFunction
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
      BaseRequest,
      BaseResponse,
      NextFunction
    >
  | TypedHandler<
      SV,
      Name,
      ContractMethod,
      Path,
      P,
      ResBodyMap,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      ResHeaders,
      LocalsObj,
      BaseRequest,
      BaseResponse,
      NextFunction
    >;
