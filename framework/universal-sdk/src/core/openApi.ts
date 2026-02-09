import { OpenAPIObject } from 'openapi3-ts/oas31';
import { isOpenAPIObject } from '../guards/isOpenApiObject';
import { RegistryOptions, SdkPathMap } from '../types/sdk.types';

export function getSdkPathMap(
  registryOpenApiJson: Record<string, OpenAPIObject>
): SdkPathMap {
  const sdkPathMap: SdkPathMap = {};
  Object.entries(registryOpenApiJson).forEach(([version, openApi]) => {
    Object.entries(openApi?.paths || {}).forEach(([path, pathItem]) => {
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

      const versionedPath =
        version === 'latest' ? undefined : version.substring(1);
      methods.forEach((method) => {
        if (pathItem[method]?.operationId) {
          sdkPathMap[
            `${pathItem[method].operationId}${versionedPath ? `.${versionedPath}` : ''}`
          ] = {
            method,
            path,
            version
          };
        }
      });
    });
  });

  return sdkPathMap;
}

export async function refreshOpenApi(
  host: string,
  registryOptions: RegistryOptions,
  existingRegistryOpenApiHash?: string
): Promise<
  | {
      updateRequired: true;
      registryOpenApiJson: Record<string, OpenAPIObject>;
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
    const rawVersionedOpenApi = isOpenAPIObject(registryOptions.raw)
      ? {
          latest: registryOptions.raw
        }
      : registryOptions.raw;
    return {
      updateRequired: true,
      registryOpenApiJson: rawVersionedOpenApi,
      registryOpenApiHash: 'static',
      sdkPathMap: getSdkPathMap(rawVersionedOpenApi)
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
  if (!registryOpenApiHashFetch.ok) {
    throw new Error(
      `Failed to fetch OpenAPI registry hash: ${registryOpenApiHashFetch.status} ${registryOpenApiHashFetch.statusText}`
    );
  }
  const registryOpenApiHash = await registryOpenApiHashFetch.text();

  if (
    existingRegistryOpenApiHash == null ||
    existingRegistryOpenApiHash !== registryOpenApiHash
  ) {
    const registryOpenApiFetch = await fetch(registry);
    if (!registryOpenApiFetch.ok) {
      throw new Error(
        `Failed to fetch OpenAPI registry: ${registryOpenApiFetch.status} ${registryOpenApiFetch.statusText}`
      );
    }
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
