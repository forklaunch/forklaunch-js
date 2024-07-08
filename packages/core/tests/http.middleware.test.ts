import { MockSchemaValidator } from '@forklaunch/validator/tests/mockSchemaValidator';
import { HttpContractDetails } from '../http';

declare module '@forklaunch/validator' {}

describe('Http Middleware Tests', () => {
  let contractDetails: HttpContractDetails<MockSchemaValidator>;
  beforeAll(() => {
    contractDetails = {
      name: 'Test Contract',
      summary: 'Test Contract Summary',
      responses: {
        200: {
          test: 'test' as const
        },
        400: 'hello'
      }
    };
  });
});
