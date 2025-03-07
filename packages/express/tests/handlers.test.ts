import { number, SchemaValidator, string } from '@forklaunch/validator/typebox';
import { forklaunchExpress, forklaunchRouter } from '../index';
import { checkout } from '../src/handlers/checkout';
import { get } from '../src/handlers/get';
import { post } from '../src/handlers/post';

describe('handlers', () => {
  const application = forklaunchExpress(SchemaValidator());
  const router = forklaunchRouter('/organization', SchemaValidator());

  it('should be able to create a path param handler', () => {
    const getRequest = get(
      SchemaValidator(),
      '/:id',
      {
        name: 'Get Organization',
        summary: 'Gets an organization by ID',
        responses: {
          200: number,
          404: string
        },
        params: {
          id: string
        },
        auth: {
          method: 'jwt',
          allowedRoles: new Set(['admin']),
          mapRoles: (sub, req) => {
            return new Set(['admin', sub, req?.params.id ?? '']);
          }
        }
      },
      async (req, res) => {
        const organizationDto = Number(req.params.id);
        if (organizationDto) {
          res.status(200).json(organizationDto);
        } else {
          res.status(404).send('Organization not found');
        }
      }
    );
    application.get('/:id', getRequest);
    router.get('/:id', getRequest);
  });

  it('should be able to create a body param handler', () => {
    const postRequest = post(
      SchemaValidator(),
      '/',
      {
        name: 'Create Organization',
        summary: 'Creates an organization',
        responses: {
          200: {
            name: string
          }
        },
        body: {
          name: string
        }
      },
      async (req, res) => {
        res.status(200).json(req.body);
      }
    );
    application.post('/', postRequest);
    router.post('/', postRequest);
  });

  it('should be able to create a middleware handler', () => {
    const checkoutMiddleware = checkout(
      SchemaValidator(),
      '/',
      {
        query: {
          name: string
        }
      },
      async (req, res) => {
        req.query.name;
      }
    );
    application.use(checkoutMiddleware);
    router.checkout(checkoutMiddleware);
  });
});
