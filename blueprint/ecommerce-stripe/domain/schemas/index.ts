import { SchemaValidator, schemaValidator } from '../../schema';
import { mapServiceSchemas } from '@forklaunch/core/mappers';
import {
  BaseCartServiceSchemas,
  BaseGiftCardServiceSchemas,
  BaseInventoryServiceSchemas,
  BaseOrderServiceSchemas,
  BasePaymentServiceSchemas,
  BaseProductServiceSchemas,
  BasePromoCodeServiceSchemas,
  BaseReviewServiceSchemas,
  BaseSubscriptionServiceSchemas,
  BaseVariantServiceSchemas
} from '@forklaunch/implementation-ecommerce-base/schemas';

// Entity ids are fp.string() (uuid-shaped strings assigned via uuid()), not
// mikro-orm's uuid column type — uuidId: false matches sqlBaseProperties.
const schemas = mapServiceSchemas(
  {
    CartSchemas: BaseCartServiceSchemas<SchemaValidator>,
    GiftCardSchemas: BaseGiftCardServiceSchemas<SchemaValidator>,
    InventorySchemas: BaseInventoryServiceSchemas<SchemaValidator>,
    OrderSchemas: BaseOrderServiceSchemas<SchemaValidator>,
    PaymentSchemas: BasePaymentServiceSchemas<SchemaValidator>,
    ProductSchemas: BaseProductServiceSchemas<SchemaValidator>,
    PromoCodeSchemas: BasePromoCodeServiceSchemas<SchemaValidator>,
    ReviewSchemas: BaseReviewServiceSchemas<SchemaValidator>,
    SubscriptionSchemas: BaseSubscriptionServiceSchemas<SchemaValidator>,
    VariantSchemas: BaseVariantServiceSchemas<SchemaValidator>
  },
  {
    validator: schemaValidator,
    uuidId: false
  }
);

export const {
  CartSchemas,
  GiftCardSchemas,
  InventorySchemas,
  OrderSchemas,
  PaymentSchemas,
  ProductSchemas,
  PromoCodeSchemas,
  ReviewSchemas,
  SubscriptionSchemas,
  VariantSchemas
} = schemas;
