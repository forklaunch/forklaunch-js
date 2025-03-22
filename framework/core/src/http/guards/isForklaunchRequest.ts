import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { ForklaunchRequest } from '../types/apiDefinition.types';
import { ParamsDictionary } from '../types/contractDetails.types';

export function isForklaunchRequest<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>
>(
  request: unknown
): request is ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders> {
  return (
    request != null &&
    typeof request === 'object' &&
    'contractDetails' in request
  );
}
