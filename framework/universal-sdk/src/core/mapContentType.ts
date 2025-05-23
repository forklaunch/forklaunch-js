import { isNever } from '@forklaunch/common';
import { ResponseContentParserType } from '../types/contentTypes.types';

export function mapContentType(
  contentType: ResponseContentParserType | undefined
) {
  switch (contentType) {
    case 'json':
      return 'application/json';
    case 'file':
      return 'application/octet-stream';
    case 'text':
      return 'text/plain';
    case 'stream':
      return 'text/event-stream';
    case undefined:
      return 'application/json';
    default:
      isNever(contentType);
      return 'application/json';
  }
}
