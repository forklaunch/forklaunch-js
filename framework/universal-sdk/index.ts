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
import { UniversalSdk } from './src/universalSdk';

export const universalSdkBuilder =
  <TypedController>() =>
  async <
    T extends {
      [K in FlattenResponseContentTypes<TypedController> as ExistingContentTypes extends K
        ? never
        : K]: ResponseContentParserType;
    }
  >({
    host,
    registryOptions,
    contentTypeParserMap
  }: {
    host: string;
    registryOptions?:
      | {
          path: string;
        }
      | {
          url: string;
        };
    contentTypeParserMap?: T;
  }) => {
    const sdkInternal = await UniversalSdk.create(
      host,
      registryOptions,
      contentTypeParserMap
    );

    const proxyInternal = new Proxy(sdkInternal, {
      get(target, prop: keyof UniversalSdk) {
        if (typeof prop === 'string' && prop in target) {
          return target[prop].bind(target);
        }
        throw new Error(`Method ${String(prop)} not found`);
      }
    });

    return proxyInternal as TypedController;
  };
