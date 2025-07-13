/**
 * Initializes the Forklaunch SDK with HTTP methods proxied.
 *
 * @template TypedController
 * @param {string} host - The host URL for the SDK.
 * @returns {TypedController} - The SDK proxy with methods for HTTP requests.
 */
import { ResponseContentParserType } from './src/types/contentTypes.types';
import { RegistryOptions } from './src/types/sdk.types';
import { UniversalSdk } from './src/universalSdk';

export const universalSdk = async <TypedController>(options: {
  host: string;
  registryOptions: RegistryOptions;
  contentTypeParserMap?: Record<string, ResponseContentParserType>;
}) => {
  const sdkInternal = await UniversalSdk.create(
    options.host,
    options.registryOptions,
    'contentTypeParserMap' in options ? options.contentTypeParserMap : undefined
  );

  const proxyInternal = new Proxy(sdkInternal, {
    get(target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined;
      }

      if (prop === 'fetch') {
        return sdkInternal.executeFetchCall;
      }

      if (typeof prop === 'string' && prop in target) {
        const value = target[prop as keyof UniversalSdk];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }

      return createSdkProxy([prop as string]);
    }
  });

  function createSdkProxy(path: string[]): unknown {
    return new Proxy(() => {}, {
      get(_target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined;
        }

        // TODO: revisit this to export fetch as a separate SDK client, when performance is figured out
        if (prop === 'fetch') {
          return sdkInternal.executeFetchCall;
        }

        if (typeof prop === 'string' && prop in sdkInternal) {
          const value = sdkInternal[prop as keyof UniversalSdk];
          if (typeof value === 'function') {
            return value.bind(sdkInternal);
          }
          return value;
        }

        const newPath = [...path, prop as string];

        if (
          prop === Symbol.toPrimitive ||
          prop === 'valueOf' ||
          prop === 'toString'
        ) {
          return () => sdkInternal.executeSdkCall(path.join('.'));
        }

        return createSdkProxy(newPath);
      },

      apply(_target, _thisArg, args) {
        return sdkInternal.executeSdkCall(path.join('.'), ...args);
      }
    });
  }

  return proxyInternal as TypedController;
};
