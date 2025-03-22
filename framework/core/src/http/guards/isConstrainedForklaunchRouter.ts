import { AnySchemaValidator } from '@forklaunch/validator';
import { ConstrainedForklaunchRouter } from '../types/router.types';
import { isForklaunchRouter } from './isForklaunchRouter';

export function isConstrainedForklaunchRouter<
  SV extends AnySchemaValidator,
  RouterHandler
>(
  maybeForklaunchExpressLikeRouter: unknown
): maybeForklaunchExpressLikeRouter is ConstrainedForklaunchRouter<
  SV,
  RouterHandler
> {
  return (
    isForklaunchRouter<SV>(maybeForklaunchExpressLikeRouter) &&
    'requestHandler' in maybeForklaunchExpressLikeRouter
  );
}
