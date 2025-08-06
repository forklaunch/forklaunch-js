import { AnySchemaValidator } from '@forklaunch/validator';
import { ForklaunchRouter } from '../types/router.types';

export function unpackRouters<SV extends AnySchemaValidator>(
  routers: ForklaunchRouter<SV>[],
  recursiveBasePath: string[] = []
): {
  fullPath: string;
  router: ForklaunchRouter<SV>;
}[] {
  return routers.reduce<
    {
      fullPath: string;
      router: ForklaunchRouter<SV>;
    }[]
  >((acc, router) => {
    const fullPath = [...recursiveBasePath, router.basePath].join('');
    acc.push({
      fullPath,
      router
    });
    acc.push(
      ...unpackRouters<SV>(router.routers, [
        ...recursiveBasePath,
        router.basePath
      ])
    );
    return acc;
  }, []);
}
