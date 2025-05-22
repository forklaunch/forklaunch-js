export type ExistingContentTypes =
  | 'application/json'
  | 'application/xml'
  | 'text/plain'
  | 'text/html'
  | 'text/css'
  | 'text/javascript'
  | 'text/csv'
  | 'text/markdown'
  | 'text/xml'
  | 'text/rtf'
  | 'text/x-yaml'
  | 'text/yaml'
  | 'application/octet-stream'
  | 'application/pdf'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/zip'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'video/mp4'
  | 'text/event-stream';

export type FlattenResponseContentTypes<T> = T extends {
  [key: string]: {
    [key: string]: {
      [key: string]: infer F;
    };
  };
}
  ? F extends (...args: never[]) => infer R
    ? R extends Promise<{ contentType: infer PC }>
      ? PC
      : R extends { contentType: infer C }
      ? C
      : never
    : never
  : never;

export type ResponseContentParserType =
  | 'json'
  | 'file'
  | 'text'
  | 'stream'
  | 'multipartForm';
