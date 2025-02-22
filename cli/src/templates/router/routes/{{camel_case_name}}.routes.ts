import { forklaunchRouter } from '@{{app_name}}/core';
import { {{pascal_case_name}}Controller } from '../controllers/{{camel_case_name}}.controller';

// defines the router for the {{camel_case_name}} routes
export const router = forklaunchRouter('/{{kebab_case_name}}');

// returns an object with the router and the {{camel_case_name}}Get and {{camel_case_name}}Post methods for easy installation
export const {{pascal_case_name}}Routes = (
  controller: {{pascal_case_name}}Controller
) => ({
  router,

  {{camel_case_name}}Get: router.get('/', controller.{{camel_case_name}}Get),
  {{camel_case_name}}Post: router.post('/', controller.{{camel_case_name}}Post)
});
