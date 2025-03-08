import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ConfigInjector, ScopedDependencyFactory } from '@forklaunch/core/services';
import { handlers, Request, Response, NextFunction, ParsedQs, SchemaValidator } from '@{{app_name}}/core';
import { configValidator } from '../bootstrapper';
import { {{pascal_case_name}}Service } from '../interfaces/{{camel_case_name}}.interface';
import { {{pascal_case_name}}RequestDtoMapper, {{pascal_case_name}}ResponseDtoMapper } from '../models/dtoMapper/{{camel_case_name}}.dtoMapper';

// Controller class that implements the {{pascal_case_name}}Service interface 
export class {{pascal_case_name}}Controller
  implements Controller<
    {{pascal_case_name}}Service, 
    Request, 
    Response, 
    NextFunction, 
    ParsedQs
  >
{
  constructor(
    // scopeFactory returns new scopes that can be used for joint transactions
    private readonly scopeFactory: () => ConfigInjector<
      SchemaValidator,
      typeof configValidator
    >,
    // serviceFactory returns a new service instance on demand
    private serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      '{{camel_case_name}}Service'
    >,
    // openTelemetryCollector for collecting logs and metrics with appropriate context
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  // GET endpoint handler that returns a simple message
  {{camel_case_name}}Get = handlers.get(
    SchemaValidator(),
    '/',
    {
      name: '{{camel_case_name}}',
      summary: '{{pascal_case_name}}',
      responses: {
        // specifies the success response schema using DtoMapper constructs
        200: {{pascal_case_name}}ResponseDtoMapper.schema()
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
  );

  // POST endpoint handler that processes request body and returns response from service
  {{camel_case_name}}Post = handlers.post(
    SchemaValidator(),
    '/',
    {
      name: '{{camel_case_name}}', 
      summary: '{{pascal_case_name}}',
      // specifies the request body schema using DtoMapper constructs
      body: {{pascal_case_name}}RequestDtoMapper.schema(),
      responses: {
        // specifies the success response schema using DtoMapper constructs
        200: {{pascal_case_name}}ResponseDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(
          // constructs a new service instance using the scopeFactory and calls the {{camel_case_name}}Post method
          await this.serviceFactory(
            this.scopeFactory()
          ).{{camel_case_name}}Post(req.body)
        );
    }
  );
}
