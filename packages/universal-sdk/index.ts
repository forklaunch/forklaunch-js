/**
 * Initializes the Forklaunch SDK with HTTP methods proxied.
 *
 * @template TypedController
 * @param {string} host - The host URL for the SDK.
 * @returns {TypedController} - The SDK proxy with methods for HTTP requests.
 */
import { UniversalSdk } from './src/universalSdk';

export const universalSdk = <TypedController>(host: string) => {
  const sdkInternal = new UniversalSdk(host);

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
