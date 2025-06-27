import { AnySchemaValidator } from '@forklaunch/validator';
import {
  HttpContractDetails,
  Method,
  PathParamHttpContractDetails
} from './contractDetails.types';

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
  fetchMap: Record<never, never>;
  /** The SDK for the router */
  sdk: Record<never, never>;
  /** The name of the SDK for the router */
  sdkName?: string;
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
  path: string | RegExp | (string | RegExp)[];
  /** The HTTP method for the route */
  method: Method;
  /** The contract details for the route */
  contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>;
}
