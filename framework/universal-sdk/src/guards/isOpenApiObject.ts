import { OpenAPIObject } from 'openapi3-ts/oas31';

export function isOpenAPIObject(obj: unknown): obj is OpenAPIObject {
  return typeof obj === 'object' && obj !== null && 'openapi' in obj;
}
