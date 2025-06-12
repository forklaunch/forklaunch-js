import { DocsConfiguration } from '@forklaunch/core/http';
import { ServerConstructorOptions } from '@forklaunch/hyper-express-fork';
import { BusboyConfig } from 'busboy';
import { CorsOptions } from 'cors';

export type ExpressOptions = {
  docs?: DocsConfiguration;
  busboy?: BusboyConfig;
  server?: ServerConstructorOptions;
  cors?: CorsOptions;
};
