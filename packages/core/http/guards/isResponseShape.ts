import { ResponseShape } from '../types';

export function isResponseShape<Params, Headers, Query, Body>(
  response: object | undefined
): response is ResponseShape<Params, Headers, Query, Body> {
  return (
    response != null &&
    Object.hasOwn(response, 'body') &&
    Object.hasOwn(response, 'query') &&
    Object.hasOwn(response, 'params') &&
    Object.hasOwn(response, 'headers')
  );
}
