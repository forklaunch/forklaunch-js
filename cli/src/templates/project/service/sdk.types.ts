/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SdkClient,
  UnpackSdkClientInput,
  ValidSdkClientInput
} from '@forklaunch/core/http';
import {
  {{camel_case_name}}Routes
} from './server';

type {{pascal_case_name}}ClientSdkInput = {
  {{camel_case_name}}: typeof {{camel_case_name}}Routes;
};

type Unpacked{{pascal_case_name}}ClientSdkInput =
  UnpackSdkClientInput<{{pascal_case_name}}ClientSdkInput>;

type Validated{{pascal_case_name}}ClientSdkInput =
  ValidSdkClientInput<Unpacked{{pascal_case_name}}ClientSdkInput>;

export type {{pascal_case_name}}SdkClient = SdkClient<{{pascal_case_name}}ClientSdkInput>; 