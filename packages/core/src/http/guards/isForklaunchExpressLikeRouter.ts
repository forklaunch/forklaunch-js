import { AnySchemaValidator } from '@forklaunch/validator';
import { ExpressLikeRouter } from '../interfaces/expressLikeRouter.interface';
import { ForklaunchExpressLikeRouter } from '../router/expressLikeRouter';
import { isConstrainedForklaunchRouter } from './isConstrainedForklaunchRouter';

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
    isConstrainedForklaunchRouter<SV, RouterHandler>(
      maybeForklaunchExpressLikeRouter
    ) && 'internal' in maybeForklaunchExpressLikeRouter
  );
}
