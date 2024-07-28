import { AnySchemaValidator } from '@forklaunch/validator';
import {
  HttpContractDetails,
  Method,
  PathParamHttpContractDetails
} from './primitive.types';

/**
 * Interface representing a Forklaunch router.
 *
 * @template SV - A type that extends AnySchemaValidator.
 */
export interface ForklaunchRouter<SV extends AnySchemaValidator> {
  /** The base path for the router */
  basePath: string;
  /** The routes associated with the router */
  routes: ForklaunchRoute<SV>[];
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
