import { OpenAPIObject } from 'openapi3-ts/oas31';
import { RegistryOptions, SdkPathMap } from '../types/sdk.types';

export function getSdkPathMap(registryOpenApiJson: OpenAPIObject): SdkPathMap {
  const sdkPathMap: SdkPathMap = {};
  Object.entries(registryOpenApiJson?.paths || {}).forEach(
    ([path, pathItem]) => {
      const methods = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'options',
        'head',
        'trace'
      ] as const;

      methods.forEach((method) => {
        if (pathItem[method]?.operationId) {
          sdkPathMap[pathItem[method].operationId] = {
            method,
            path
          };
        }
      });
    }
  );

  return sdkPathMap;
}

export async function refreshOpenApi(
  host: string,
  registryOptions: RegistryOptions,
  existingRegistryOpenApiHash?: string
): Promise<
  | {
      updateRequired: true;
      registryOpenApiJson: OpenAPIObject;
      registryOpenApiHash: string;
      sdkPathMap: SdkPathMap;
    }
  | {
      updateRequired: false;
    }
> {
  if (
    existingRegistryOpenApiHash === 'static' ||
    ('static' in registryOptions && registryOptions.static)
  ) {
    return {
      updateRequired: false
    };
  }

  if ('raw' in registryOptions) {
    return {
      updateRequired: true,
      registryOpenApiJson: registryOptions.raw,
      registryOpenApiHash: 'static',
      sdkPathMap: getSdkPathMap(registryOptions.raw)
    };
  }

  const registry =
    'path' in registryOptions
      ? `${host}/${registryOptions.path}`
      : 'url' in registryOptions
        ? registryOptions.url
        : null;

  if (registry == null) {
    throw new Error('Raw OpenAPI JSON or registry information not provided');
  }

  const registryOpenApiHashFetch = await fetch(`${registry}-hash`);
  const registryOpenApiHash = await registryOpenApiHashFetch.text();

  if (
    existingRegistryOpenApiHash == null ||
    existingRegistryOpenApiHash !== registryOpenApiHash
  ) {
    const registryOpenApiFetch = await fetch(registry);
    const registryOpenApiJson = await registryOpenApiFetch.json();

    return {
      updateRequired: true,
      registryOpenApiJson,
      registryOpenApiHash,
      sdkPathMap: getSdkPathMap(registryOpenApiJson)
    };
  }

  return {
    updateRequired: false
  };
}
