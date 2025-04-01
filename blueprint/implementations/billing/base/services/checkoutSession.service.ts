import {
  CheckoutSessionDto,
  CheckoutSessionService,
  CheckoutSessionServiceParameters,
  CreateCheckoutSessionDto,
  UpdateCheckoutSessionDto
} from '@forklaunch/blueprint-billing-interfaces';
import { IdDto, ReturnTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  InternalDtoMapper,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';

export class BaseCheckoutSessionService<
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
  SchemaDefinition!: CheckoutSessionServiceParameters<PaymentMethodEnum>;
  #dtoMappers: InternalDtoMapper<
    ReturnTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly paymentMethodEnum: PaymentMethodEnum,
    protected readonly dtoMappers: {
      CheckoutSessionDtoMapper: () => {
        dto: Dto['CheckoutSessionDtoMapper'];
        _Entity: Entities['CheckoutSessionDtoMapper'];
        serializeEntityToDto: unknown;
      };
      CreateCheckoutSessionDtoMapper: () => {
        dto: Dto['CreateCheckoutSessionDtoMapper'];
        _Entity: Entities['CreateCheckoutSessionDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
      UpdateCheckoutSessionDtoMapper: () => {
        dto: Dto['UpdateCheckoutSessionDtoMapper'];
        _Entity: Entities['UpdateCheckoutSessionDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(dtoMappers);
  }

  protected createCacheKey = createCacheKey('checkout_session');

  async createCheckoutSession(
    checkoutSessionDto: Dto['CreateCheckoutSessionDtoMapper']
  ): Promise<Dto['CheckoutSessionDtoMapper']> {
    const checkoutSession =
      this.#dtoMappers.CreateCheckoutSessionDtoMapper.deserializeDtoToEntity(
        checkoutSessionDto
      );

    // Store the checkoutSession details in the cache
    await this.cache.putRecord({
      key: this.createCacheKey(checkoutSession.id),
      value: checkoutSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#dtoMappers.CheckoutSessionDtoMapper.serializeEntityToDto(
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

    return this.#dtoMappers.CheckoutSessionDtoMapper.serializeEntityToDto(
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
