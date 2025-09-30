import { AnySchemaValidator } from '@forklaunch/validator';
import {
  HttpContractDetails,
  Method,
  PathParamHttpContractDetails,
  SessionObject
} from './contractDetails.types';
import { ExpressLikeRouterOptions } from './expressLikeOptions';

export interface ConstrainedForklaunchRouter<
  SV extends AnySchemaValidator,
  RequestHandler
> extends ForklaunchRouter<SV> {
  requestHandler: RequestHandler;
}

/**
 * Interface representing a Forklaunch router.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export interface ForklaunchRouter<SV extends AnySchemaValidator> {
  /** The base path for the router */
  basePath: `/${string}`;
  /** The routes associated with the router */
  routes: ForklaunchRoute<SV>[];
  /** Nested routers */
  routers: ForklaunchRouter<SV>[];
  /** Nested route map */
  _fetchMap: Record<string, unknown>;
  /** The SDK for the router */
  sdk: Record<string, unknown>;
  /** The name of the SDK for the router */
  sdkName?: string;
  /** The SDK paths for the router */
  sdkPaths: Record<string, string>;
  /** Options for the router */
  routerOptions?: ExpressLikeRouterOptions<SV, SessionObject<SV>>;
  /** Insert the SDK path into the router */
  insertIntoRouterSdkPaths?: (params: {
    sdkPath: string;
    path: string;
    method: string;
    name: string;
  }) => void;
}

/**
 * Interface representing a Forklaunch route.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export interface ForklaunchRoute<SV extends AnySchemaValidator> {
  /** The base path for the route */
  basePath: string;
  /** The path for the route, which can be a string, RegExp, or an array of strings or RegExps */
  path: `/${string}`;
  /** The HTTP method for the route */
  method: Method;
  /** The contract details for the route */
  contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>;
}
