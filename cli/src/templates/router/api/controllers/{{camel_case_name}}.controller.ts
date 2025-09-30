import { handlers, schemaValidator } from '@{{app_name}}/core';
import { {{pascal_case_name}}Service } from '../../domain/interfaces/{{camel_case_name}}.interface';
import { {{pascal_case_name}}RequestMapper, {{pascal_case_name}}ResponseMapper } from '../../domain/mappers/{{camel_case_name}}.mappers';
import { ci, tokens } from '../../bootstrapper';
import { {{pascal_case_name}}ServiceFactory } from '../routes/{{camel_case_name}}.routes';

//! resolve the dependencies
//! scopeFactory creates a new dependency injection scope for the service
const scopeFactory = () => ci.createScope();
// serviceFactory returns a new service instance on demand
const serviceFactory = ci.scopedResolver(tokens.{{pascal_case_name}}Service);
// openTelemetryCollector for collecting logs and metrics with appropriate context
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

  // GET endpoint handler that returns a simple message
export const {{camel_case_name}}Get = handlers.get(
  schemaValidator,
  '/',
  {
    name: '{{camel_case_name}}',
    summary: '{{pascal_case_name}}',
    responses: {
      // specifies the success response schema using Mapper constructs
      200: {{pascal_case_name}}ResponseMapper.schema
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
export const {{camel_case_name}}Post = handlers.post(
  schemaValidator,
  '/',
  {
    name: '{{camel_case_name}}', 
    summary: '{{pascal_case_name}}',
    // specifies the request body schema using Mapper constructs
    body: {{pascal_case_name}}RequestMapper.schema,
    responses: {
      // specifies the success response schema using Mapper constructs
      200: {{pascal_case_name}}ResponseMapper.schema
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
);
