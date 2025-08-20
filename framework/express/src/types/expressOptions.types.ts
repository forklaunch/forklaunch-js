import {
  ExpressLikeApplicationOptions,
  ExpressLikeRouterOptions,
  SessionObject
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
import { BusboyConfig } from 'busboy';

export type ExpressApplicationOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeApplicationOptions<SV, SessionSchema> & {
  busboy?: BusboyConfig;
  text?: OptionsText;
  json?: OptionsJson;
  urlencoded?: OptionsUrlencoded;
};

export type ExpressRouterOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeRouterOptions<SV, SessionSchema> & {
  busboy?: BusboyConfig;
  text?: OptionsText;
  json?: OptionsJson;
  urlencoded?: OptionsUrlencoded;
};
