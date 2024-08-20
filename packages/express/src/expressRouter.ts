import {
  ForklaunchExpressLikeRouter,
  ForklaunchRouter
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import express, { Router as ExpressRouter, RequestHandler } from 'express';
import { enrichResponseTransmission } from './middleware/response.middleware';

/**
 * Router class that sets up routes and middleware for an Express router.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @implements {ForklaunchRouter<SV>}
 */
export class Router<
    SV extends AnySchemaValidator,
    BasePath extends `/${string}`
  >
  extends ForklaunchExpressLikeRouter<
    SV,
    BasePath,
    RequestHandler,
    ExpressRouter
  >
  implements ForklaunchRouter<SV>
{
  /**
   * Creates an instance of Router.
   *
   * @param {string} basePath - The base path for the router.
   * @param {SV} schemaValidator - The schema validator.
   */
  constructor(
    public basePath: BasePath,
    schemaValidator: SV
  ) {
    super(basePath, schemaValidator, express.Router());

    this.internal.use(express.json());
    this.internal.use(enrichResponseTransmission as unknown as RequestHandler);
  }
}
