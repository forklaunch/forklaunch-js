import { toPrettyCamelCase } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { ForklaunchRouter } from '../types/router.types';

export function unpackRouters<SV extends AnySchemaValidator>(
  routers: ForklaunchRouter<SV>[],
  recursiveBasePath: string[] = [],
  recursiveSdkPath: string[] = []
): {
  fullPath: string;
  sdkPath: string;
  router: ForklaunchRouter<SV>;
}[] {
  return routers.reduce<
    {
      fullPath: string;
      sdkPath: string;
      router: ForklaunchRouter<SV>;
    }[]
  >((acc, router) => {
    acc.push({
      fullPath: [...recursiveBasePath, router.basePath].join(''),
      sdkPath: [
        ...recursiveSdkPath,
        toPrettyCamelCase(router.sdkName ?? router.basePath)
      ].join('.'),
      router
    });
    acc.push(
      ...unpackRouters<SV>(
        router.routers,
        [...recursiveBasePath, router.basePath],
        [
          ...recursiveSdkPath,
          toPrettyCamelCase(router.sdkName ?? router.basePath)
        ]
      )
    );
    return acc;
  }, []);
}
