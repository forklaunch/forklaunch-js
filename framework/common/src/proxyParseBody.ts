import { safeStringify } from './safeStringify';
import {
  DiscriminatedProxyRequestType,
  ProxyRequestType
} from './types/sdk.types';

export function openApiCompliantPath(path: string) {
  return path.replaceAll(/:(\w+)/g, '{$1}');
}

export async function proxyParseBody(
  body: ProxyRequestType['body']
): Promise<DiscriminatedProxyRequestType> {
  let defaultContentType: DiscriminatedProxyRequestType['defaultContentType'] =
    'application/json';
  let parsedBody: DiscriminatedProxyRequestType['parsedBody'];

  if (body != null) {
    if ('schema' in body && body.schema != null) {
      defaultContentType = 'application/json';
      parsedBody = safeStringify(body.schema);
    } else if ('json' in body && body.json != null) {
      defaultContentType = 'application/json';
      parsedBody = safeStringify(body.json);
    } else if ('text' in body && body.text != null) {
      defaultContentType = 'text/plain';
      parsedBody = body.text;
    } else if ('binary' in body && body.binary != null) {
      defaultContentType = 'application/octet-stream';
      if (body.binary instanceof File || body.binary instanceof Blob) {
        parsedBody = await body.binary.text();
      } else {
        parsedBody = safeStringify(body.binary);
      }
    } else if ('multipartForm' in body && body.multipartForm != null) {
      defaultContentType = 'multipart/form-data';
      const formData = new FormData();
      for (const key in body.multipartForm) {
        if (Object.prototype.hasOwnProperty.call(body.multipartForm, key)) {
          const multipartForm = body.multipartForm as Record<string, unknown>;
          const value = multipartForm[key];

          if (value instanceof Blob || value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'function') {
            const producedFile = (await value(
              'test.txt',
              'text/plain'
            )) as File;
            formData.append(key, producedFile);
          } else if (Array.isArray(value)) {
            for (const item of value) {
              formData.append(
                key,
                item instanceof Blob || item instanceof File
                  ? item
                  : typeof item === 'function'
                    ? safeStringify(await item('test.txt', 'text/plain'))
                    : safeStringify(item)
              );
            }
          } else {
            formData.append(key, safeStringify(value));
          }
        }
      }
      parsedBody = formData;
    } else if ('urlEncodedForm' in body && body.urlEncodedForm != null) {
      defaultContentType = 'application/x-www-form-urlencoded';
      parsedBody = new URLSearchParams(
        Object.entries(body.urlEncodedForm).map(([key, value]) => [
          key,
          safeStringify(value)
        ])
      );
    } else {
      parsedBody = safeStringify(body);
    }
  }

  return {
    defaultContentType,
    parsedBody
  } as DiscriminatedProxyRequestType;
}
