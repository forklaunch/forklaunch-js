import { DocsConfiguration } from '@forklaunch/core/http';
import { FastMCP } from '@forklaunch/fastmcp-fork';
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
import { BusboyConfig } from 'busboy';
import { CorsOptions } from 'cors';

export type ExpressOptions<T extends Record<string, unknown> | undefined> = {
  docs?: DocsConfiguration;
  busboy?: BusboyConfig;
  text?: OptionsText;
  json?: OptionsJson;
  urlencoded?: OptionsUrlencoded;
  cors?: CorsOptions;
  mcp?: {
    sessionAuth?: T;
    options?: ConstructorParameters<typeof FastMCP<T>>[0];
  };
};
