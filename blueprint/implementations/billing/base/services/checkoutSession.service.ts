import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { CheckoutSessionService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
  UpdateCheckoutSessionDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';

export class BaseCheckoutSessionService<
  SchemaValidator extends AnySchemaValidator,
  PaymentMethodEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
    CreateCheckoutSessionDtoMapper: CreateCheckoutSessionDto<PaymentMethodEnum>;
    UpdateCheckoutSessionDtoMapper: UpdateCheckoutSessionDto<PaymentMethodEnum>;
  } = {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
    CreateCheckoutSessionDtoMapper: CreateCheckoutSessionDto<PaymentMethodEnum>;
    UpdateCheckoutSessionDtoMapper: UpdateCheckoutSessionDto<PaymentMethodEnum>;
  },
  Entities extends {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
    CreateCheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
    UpdateCheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
  } = {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
    CreateCheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
    UpdateCheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum>;
  }
> implements CheckoutSessionService<PaymentMethodEnum>
{
  #mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;

  constructor(
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      CheckoutSessionDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['CheckoutSessionDtoMapper'],
        Entities['CheckoutSessionDtoMapper']
      >;
      CreateCheckoutSessionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateCheckoutSessionDtoMapper'],
        Entities['CreateCheckoutSessionDtoMapper']
      >;
      UpdateCheckoutSessionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateCheckoutSessionDtoMapper'],
        Entities['UpdateCheckoutSessionDtoMapper']
      >;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
  }

  protected createCacheKey = createCacheKey('checkout_session');

  async createCheckoutSession(
    checkoutSessionDto: Dto['CreateCheckoutSessionDtoMapper']
  ): Promise<Dto['CheckoutSessionDtoMapper']> {
    const checkoutSession =
      await this.#mappers.CreateCheckoutSessionDtoMapper.deserializeDtoToEntity(
        checkoutSessionDto
      );

    // Store the checkoutSession details in the cache
    await this.cache.putRecord({
      key: this.createCacheKey(checkoutSession.id),
      value: checkoutSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#mappers.CheckoutSessionDtoMapper.serializeEntityToDto(
      checkoutSession
    );
  }

  async getCheckoutSession({
    id
  }: IdDto): Promise<Dto['CheckoutSessionDtoMapper']> {
    const checkoutSessionDetails = await this.cache.readRecord<
      Entities['CheckoutSessionDtoMapper']
    >(this.createCacheKey(id));
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }

    return this.#mappers.CheckoutSessionDtoMapper.serializeEntityToDto(
      checkoutSessionDetails.value
    );
  }

  async expireCheckoutSession({ id }: IdDto): Promise<void> {
    const checkoutSessionDetails = await this.cache.readRecord(
      this.createCacheKey(id)
    );
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutSuccess({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Checkout success', { id });
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutFailure({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Checkout failure', { id });
    await this.cache.deleteRecord(this.createCacheKey(id));
  }
}
