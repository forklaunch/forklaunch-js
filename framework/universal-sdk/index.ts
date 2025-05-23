/**
 * Initializes the Forklaunch SDK with HTTP methods proxied.
 *
 * @template TypedController
 * @param {string} host - The host URL for the SDK.
 * @returns {TypedController} - The SDK proxy with methods for HTTP requests.
 */
import {
  ExistingContentTypes,
  FlattenResponseContentTypes,
  ResponseContentParserType
} from './src/types/contentTypes.types';
import { RegistryOptions } from './src/types/sdk.types';
import { UniversalSdk } from './src/universalSdk';

export const universalSdkBuilder =
  <TypedController>() =>
  async <
    T extends {
      [K in FlattenResponseContentTypes<TypedController> as ExistingContentTypes extends K
        ? never
        : K]: ResponseContentParserType;
    }
  >(
    options: unknown extends T
      ? {
          host: string;
          registryOptions: RegistryOptions;
        }
      : {
          host: string;
          registryOptions: RegistryOptions;
          contentTypeParserMap: T;
        }
  ) => {
    const sdkInternal = await UniversalSdk.create(
      options.host,
      options.registryOptions,
      'contentTypeParserMap' in options
        ? options.contentTypeParserMap
        : undefined
    );

    const proxyInternal = new Proxy(sdkInternal, {
      get(target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined;
        }
        if (typeof prop === 'string' && prop in target) {
          const value = target[prop as keyof UniversalSdk];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
        return new Proxy(() => {}, {
          get(_innerTarget, innerProp) {
            if (typeof innerProp === 'string' && innerProp in target) {
              const value = target[innerProp as keyof UniversalSdk];
              if (typeof value === 'function') {
                return value.bind(target);
              }
              return value;
            }
            return undefined;
          }
        });
      }
    });

    return proxyInternal as TypedController;
  };
