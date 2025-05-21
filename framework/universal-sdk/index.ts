/**
 * Initializes the Forklaunch SDK with HTTP methods proxied.
 *
 * @template TypedController
 * @param {string} host - The host URL for the SDK.
 * @returns {TypedController} - The SDK proxy with methods for HTTP requests.
 */
import { UniversalSdk } from './src/universalSdk';

// type FlattenResponseContentTypes<T> = T extends {
//   [key: string]: {
//     [key: string]: {
//       [key: string]: infer X;
//     };
//   };
// }
//   ? X extends (...args: never[]) => infer P
//     ? P extends Promise<{ contentType: infer PC }>
//       ? PC
//       : P extends { contentType: infer C }
//         ? C
//         : never
//     : never
//   : never;

export const universalSdkBuilder =
  <TypedController>() =>
  <
    T extends Record<string, 'json' | 'file' | 'text' | 'bytes' | 'arrayBuffer'>
  >({
    host,
    contentTypeParserMap
  }: {
    host: string;
    contentTypeParserMap?: T;
  }) => {
    const sdkInternal = new UniversalSdk(host, contentTypeParserMap);

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
