import { sdkRouter } from '@forklaunch/core/http';
import { forklaunchRouter, schemaValidator } from '@{{app_name}}/core';
import { {{pascal_case_name}}Controller } from '../controllers/{{camel_case_name}}.controller';
import { ci, tokens } from '../../server';

// resolve the dependencies
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const {{camel_case_name}}ServiceFactory = ci.scopedResolver(
  tokens.{{pascal_case_name}}Service
);

// export the service factory type
export type {{pascal_case_name}}ServiceFactory = typeof {{camel_case_name}}ServiceFactory;


// defines the router for the {{camel_case_name}} routes
export const {{camel_case_name}}Router = forklaunchRouter(
  '/{{kebab_case_name}}',
  schemaValidator, 
  openTelemetryCollector
);

// instantiate the controller
const controller = {{pascal_case_name}}Controller(
  ci.createScope,
  {{camel_case_name}}ServiceFactory,
  openTelemetryCollector
);

// mount the routes
{{camel_case_name}}Router.get('/', controller.{{camel_case_name}}Get)
{{camel_case_name}}Router.post('/', controller.{{camel_case_name}}Post);

// create an sdk binding for the router
export const {{camel_case_name}}SdkRouter = sdkRouter(schemaValidator, controller, {{camel_case_name}}Router);