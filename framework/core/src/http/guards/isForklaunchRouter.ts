import { AnySchemaValidator } from '@forklaunch/validator';
import { ForklaunchRouter } from '../types/router.types';

export function isForklaunchRouter<SV extends AnySchemaValidator>(
  maybeForklaunchRouter: unknown
): maybeForklaunchRouter is ForklaunchRouter<SV> {
  return (
    maybeForklaunchRouter != null &&
    typeof maybeForklaunchRouter === 'object' &&
    'basePath' in maybeForklaunchRouter &&
    'routes' in maybeForklaunchRouter &&
    Array.isArray(maybeForklaunchRouter.routes)
  );
}
