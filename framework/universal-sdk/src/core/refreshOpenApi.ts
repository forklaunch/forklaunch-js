import { OpenAPIObject } from 'openapi3-ts/oas31';
import { RegistryOptions } from '../types/sdk.types';

export async function refreshOpenApi(
  host: string,
  registryOptions: RegistryOptions,
  existingRegistryOpenApiHash?: string
): Promise<
  | {
      updateRequired: true;
      registryOpenApiJson: OpenAPIObject;
      registryOpenApiHash: string;
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
      registryOpenApiHash: 'static'
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
      registryOpenApiHash
    };
  }

  return {
    updateRequired: false
  };
}
