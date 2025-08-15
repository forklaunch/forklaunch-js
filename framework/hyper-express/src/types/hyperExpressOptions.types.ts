import {
  ExpressLikeApplicationOptions,
  ExpressLikeRouterOptions,
  SessionObject
} from '@forklaunch/core/http';
import { ServerConstructorOptions } from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
import { BusboyConfig } from 'busboy';
import { CorsOptions } from 'cors';

export type ExpressApplicationOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeApplicationOptions<SV, SessionSchema> & {
  busboy?: BusboyConfig;
  server?: ServerConstructorOptions;
  cors?: CorsOptions;
};

export type ExpressRouterOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeRouterOptions<SV, SessionSchema> & {
  busboy?: BusboyConfig;
};
