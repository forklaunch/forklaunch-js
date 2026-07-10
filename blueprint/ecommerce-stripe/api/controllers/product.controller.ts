import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import {
  CreateProductMapper,
  ProductMapper,
  UpdateProductMapper
} from '../../domain/mappers/product.mappers';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const serviceFactory = ci.scopedResolver(tokens.ProductService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export const createProduct = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Create Product',
    access: 'internal',
    summary: 'Create a product',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: CreateProductMapper.schema,
    responses: { 200: ProductMapper.schema }
  },
  async (req, res) => {
    openTelemetryCollector.debug('Creating product', req.body);
    res.status(200).json(await serviceFactory().createProduct(req.body));
  }
);

export const getProduct = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Product',
    access: 'internal',
    summary: 'Get a product',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: ProductMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().getProduct(req.params));
  }
);

export const getProductByHandle = handlers.get(
  schemaValidator,
  '/handle/:handle',
  {
    name: 'Get Product By Handle',
    access: 'internal',
    summary: 'Get a product by its URL handle',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: { handle: string },
    responses: { 200: ProductMapper.schema }
  },
  async (req, res) => {
    res
      .status(200)
      .json(await serviceFactory().getProductByHandle(req.params));
  }
);

export const updateProduct = handlers.put(
  schemaValidator,
  '/',
  {
    name: 'Update Product',
    access: 'internal',
    summary: 'Update a product',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: UpdateProductMapper.schema,
    responses: { 200: ProductMapper.schema }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().updateProduct(req.body));
  }
);

export const deleteProduct = handlers.delete(
  schemaValidator,
  '/:id',
  {
    name: 'Delete Product',
    access: 'internal',
    summary: 'Delete a product',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    params: IdSchema,
    responses: { 200: string }
  },
  async (req, res) => {
    await serviceFactory().deleteProduct(req.params);
    res.status(200).send('Deleted product');
  }
);

export const listProducts = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Products',
    access: 'internal',
    summary: 'List products',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    query: IdsSchema,
    responses: { 200: array(ProductMapper.schema) }
  },
  async (req, res) => {
    res.status(200).json(await serviceFactory().listProducts(req.query));
  }
);
