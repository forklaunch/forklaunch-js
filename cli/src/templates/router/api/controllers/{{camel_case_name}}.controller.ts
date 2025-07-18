import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ConfigInjector, ScopedDependencyFactory } from '@forklaunch/core/services';
import { handlers, SchemaValidator } from '@{{app_name}}/core';
import { Metrics } from '@{{app_name}}/monitoring';
import { {{pascal_case_name}}Service } from '../../domain/interfaces/{{camel_case_name}}.interface';
import { {{pascal_case_name}}RequestMapper, {{pascal_case_name}}ResponseMapper } from '../../domain/mappers/{{camel_case_name}}.mappers';
import { SchemaDependencies } from '../../registrations';

// Controller class that implements the {{pascal_case_name}}Service interface 
export const {{pascal_case_name}}Controller = (
  // scopeFactory returns new scopes that can be used for joint transactions
    scopeFactory: () => ConfigInjector<
      SchemaValidator,
      SchemaDependencies
    >,
    // serviceFactory returns a new service instance on demand
    serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      SchemaDependencies,
      '{{pascal_case_name}}Service'
    >,
    // openTelemetryCollector for collecting logs and metrics with appropriate context
    openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) => ({
  // GET endpoint handler that returns a simple message
  {{camel_case_name}}Get: handlers.get(
    SchemaValidator(),
    '/',
    {
      name: '{{camel_case_name}}',
      summary: '{{pascal_case_name}}',
      responses: {
        // specifies the success response schema using Mapper constructs
        200: {{pascal_case_name}}ResponseMapper.schema()
      }
    },
    async (req, res) => {
      res.status(200).json({
        message: '{{pascal_case_name}}'{{#is_worker}},
        processed: false,
        retryCount: 0
        {{/is_worker}}
      });
    }
  ),

  // POST endpoint handler that processes request body and returns response from service
  {{camel_case_name}}Post: handlers.post(
    SchemaValidator(),
    '/',
    {
      name: '{{camel_case_name}}', 
      summary: '{{pascal_case_name}}',
      // specifies the request body schema using Mapper constructs
      body: {{pascal_case_name}}RequestMapper.schema(),
      responses: {
        // specifies the success response schema using Mapper constructs
        200: {{pascal_case_name}}ResponseMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(
          // constructs a new service instance using the scopeFactory and calls the {{camel_case_name}}Post method
          await serviceFactory(
            scopeFactory()
          ).{{camel_case_name}}Post(req.body)
        );
    }
  )
}) satisfies Controller<{{pascal_case_name}}Service>;
