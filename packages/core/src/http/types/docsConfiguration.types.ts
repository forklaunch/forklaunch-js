import { ApiReferenceConfiguration } from '@scalar/express-api-reference';

export type DocsConfiguration =
  | ({
      type: 'scalar';
    } & Partial<Omit<ApiReferenceConfiguration, 'spec'>>)
  | {
      type: 'swagger';
    };
