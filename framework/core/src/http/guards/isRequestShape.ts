import { ResponseShape } from '../types/apiDefinition.types';

export function isRequestShape<Params, Headers, Query, Body>(
  maybeResponseShape: object | undefined
): maybeResponseShape is ResponseShape<Params, Headers, Query, Body> {
  return (
    maybeResponseShape != null &&
    ('body' in maybeResponseShape ||
      'query' in maybeResponseShape ||
      'params' in maybeResponseShape ||
      'headers' in maybeResponseShape)
  );
}
