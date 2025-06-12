import { DocsConfiguration } from '@forklaunch/core/http';
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
import { BusboyConfig } from 'busboy';
import { CorsOptions } from 'cors';

export type ExpressOptions = {
  docs?: DocsConfiguration;
  busboy?: BusboyConfig;
  text?: OptionsText;
  json?: OptionsJson;
  urlencoded?: OptionsUrlencoded;
  cors?: CorsOptions;
};
