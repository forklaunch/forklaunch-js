import { forklaunchRouter } from '@{{app_name}}/core';
import { } from {};
{pascal_case_service_name}}Controller } from '../controllers/{{camel_case_service_name}}.controller';

// defines the router for the {{camel_case_service_name}} routes
export const router = forklaunchRouter('/hello');

// returns an object with the router and the {{camel_case_service_name}}Get and {{camel_case_service_name}}Post methods for easy installation
export const {{pascal_case_service_name}}Routes = (
  controller: {{pascal_case_service_name}}Controller
) => ({
  router,

  {{camel_case_service_name}}Get: router.get('/', controller.{{camel_case_service_name}}Get),
  {{camel_case_service_name}}Post: router.post('/', controller.{{camel_case_service_name}}Post)
});
