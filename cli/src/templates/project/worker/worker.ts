import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@{{app_name}}/core';
import { bootstrap } from './bootstrapper';
import { {{pascal_case_service_name}}Controller } from './controllers/{{camel_case_service_name}}.controller';
import { {{pascal_case_service_name}}Routes } from './routes/{{camel_case_service_name}}.routes';

// bootstrap function that initializes the application
bootstrap((ci) => {

});
