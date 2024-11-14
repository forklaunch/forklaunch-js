import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import { ForklaunchExpressLikeRouter } from '../router/expressLikeRouter';
import { isForklaunchRouter } from './isForklaunchRouter';

export function isForklaunchExpressLikeRouter<
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  RouterHandler,
  Internal extends ExpressLikeRouter<RouterHandler, Internal>
>(
  maybeForklaunchExpressLikeRouter: unknown
): maybeForklaunchExpressLikeRouter is ForklaunchExpressLikeRouter<
  SV,
  Path,
  RouterHandler,
  Internal
> {
  return (
    isForklaunchRouter<SV>(maybeForklaunchExpressLikeRouter) &&
    'internal' in maybeForklaunchExpressLikeRouter
  );
}
