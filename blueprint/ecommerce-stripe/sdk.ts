import { SchemaValidator } from './schema';
import { MapToSdk } from '@forklaunch/core/http';

//! SDK surface is built up incrementally as each entity's PR lands.
export type EcommerceSdk = Record<string, never>;

export const ecommerceSdkClient = {} satisfies EcommerceSdk;

export type EcommerceSdkClient = MapToSdk<SchemaValidator, EcommerceSdk>;
