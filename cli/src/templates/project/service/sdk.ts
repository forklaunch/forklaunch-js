import { SchemaValidator } from "@{{app_name}}/core";
import { MapToSdk } from '@forklaunch/core/http';
import { {{camel_case_name}}Get, {{camel_case_name}}Post } from "./api/controllers";

//! defines the sdk type for deep linking with types
export type {{pascal_case_name}}Sdk = {
  {{camel_case_name}}: {
    {{camel_case_name}}Get: typeof {{camel_case_name}}Get;
    {{camel_case_name}}Post: typeof {{camel_case_name}}Post;
  };
};

//! creates an instance of the sdkClient
export const {{camel_case_name}}SdkClient = {
  {{camel_case_name}}: {
    {{camel_case_name}}Get: {{camel_case_name}}Get,
    {{camel_case_name}}Post: {{camel_case_name}}Post
  }
} satisfies {{pascal_case_name}}Sdk;

//! exports the universally friendly sdk typings
export type {{pascal_case_name}}SdkClient = MapToSdk<SchemaValidator, {{pascal_case_name}}Sdk>;