export type ProxyRequestType = {
  params?: Record<string, string | number | boolean>;
  body?:
    | {
        [K: string]: unknown;
        contentType?: never;
        json?: never;
        text?: never;
        file?: never;
        multipartForm?: never;
        urlEncodedForm?: never;
        schema?: never;
      }
    | ({
        contentType?: string;
      } & (
        | {
            json: Record<string, unknown>;
          }
        | {
            text: string;
          }
        | {
            file: File | Blob | string;
          }
        | {
            multipartForm: Record<string, unknown>;
          }
        | {
            urlEncodedForm: Record<string, unknown>;
          }
        | {
            schema: Record<string, unknown>;
          }
      ));
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
};

export type DiscriminatedProxyRequestType =
  | {
      defaultContentType: 'application/x-www-form-urlencoded';
      parsedBody?: URLSearchParams;
    }
  | {
      defaultContentType: 'multipart/form-data';
      parsedBody?: FormData;
    }
  | {
      defaultContentType: 'application/octet-stream';
      parsedBody?: string;
    }
  | {
      defaultContentType: 'text/plain';
      parsedBody?: string;
    }
  | {
      defaultContentType: 'application/json';
      parsedBody?: Record<string, unknown>;
    };

export type ResponseType = {
  code: number;
  response: unknown;
  headers: Headers;
};
