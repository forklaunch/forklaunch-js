import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BasePaymentLinkService } from '@forklaunch/implementation-billing-base/services';
import { PaymentLinkService } from '@forklaunch/interfaces-billing/interfaces';
import {
  IdentityRequestMapper,
  IdentityResponseMapper,
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import {
  StripeCreatePaymentLinkDto,
  StripePaymentLinkDto,
  StripePaymentLinkDtos,
  StripeUpdatePaymentLinkDto
} from '../types/stripe.dto.types';
import { StripePaymentLinkEntities } from '../types/stripe.entity.types';

export class StripePaymentLinkService<
  SchemaValidator extends AnySchemaValidator,
  StatusEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends
    StripePaymentLinkDtos<StatusEnum> = StripePaymentLinkDtos<StatusEnum>,
  Entities extends
    StripePaymentLinkEntities<StatusEnum> = StripePaymentLinkEntities<StatusEnum>
> implements
    PaymentLinkService<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum,
      {
        CreatePaymentLinkDto: StripeCreatePaymentLinkDto<StatusEnum>;
        UpdatePaymentLinkDto: StripeUpdatePaymentLinkDto<StatusEnum>;
        PaymentLinkDto: StripePaymentLinkDto<StatusEnum>;
        IdDto: IdDto;
        IdsDto: IdsDto;
      }
    >
{
  basePaymentLinkService: BasePaymentLinkService<
    SchemaValidator,
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum,
    Metrics,
    Entities,
    Entities
  >;
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>
  >;

  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PaymentLinkDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['PaymentLinkDtoMapper'],
        Entities['PaymentLinkDtoMapper']
      >;
      CreatePaymentLinkDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreatePaymentLinkDtoMapper'],
        Entities['CreatePaymentLinkDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['CreatePaymentLinkDtoMapper'],
          em?: EntityManager,
          paymentLink?: Stripe.PaymentLink
        ) => Promise<Entities['CreatePaymentLinkDtoMapper']>
      >;
      UpdatePaymentLinkDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePaymentLinkDtoMapper'],
        Entities['UpdatePaymentLinkDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['UpdatePaymentLinkDtoMapper'],
          em?: EntityManager,
          paymentLink?: Stripe.PaymentLink
        ) => Promise<Entities['UpdatePaymentLinkDtoMapper']>
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.basePaymentLinkService = new BasePaymentLinkService(
      em,
      cache,
      openTelemetryCollector,
      schemaValidator,
      {
        PaymentLinkDtoMapper: IdentityResponseMapper<
          Entities['PaymentLinkDtoMapper'],
          SchemaValidator
        >,
        CreatePaymentLinkDtoMapper: IdentityRequestMapper<
          Entities['CreatePaymentLinkDtoMapper'],
          SchemaValidator
        >,
        UpdatePaymentLinkDtoMapper: IdentityRequestMapper<
          Entities['UpdatePaymentLinkDtoMapper'],
          SchemaValidator
        >
      },
      options
    );
  }

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    const session = await this.stripeClient.paymentLinks.create({
      ...paymentLinkDto.stripeFields,
      payment_method_types: paymentLinkDto.paymentMethods,
      currency: paymentLinkDto.currency as string
    });

    const paymentLinkEntity =
      await this.basePaymentLinkService.createPaymentLink(
        await this._mappers.CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,
          {
            ...paymentLinkDto,
            id: session.id,
            amount:
              session.line_items?.data.reduce<number>(
                (total, item) => total + item.amount_total,
                0
              ) ?? 0
          },
          this.em,
          session
        )
      );

    return this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      paymentLinkEntity
    );
  }

  async updatePaymentLink(
    paymentLinkDto: Dto['UpdatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    const session = await this.stripeClient.paymentLinks.update(
      paymentLinkDto.id,
      {
        ...paymentLinkDto.stripeFields,
        payment_method_types: paymentLinkDto.paymentMethods
      }
    );

    const paymentLinkEntity =
      await this.basePaymentLinkService.updatePaymentLink(
        await this._mappers.UpdatePaymentLinkDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,
          {
            ...paymentLinkDto,
            id: session.id,
            amount:
              session.line_items?.data.reduce<number>(
                (total, item) => total + item.amount_total,
                0
              ) ?? 0
          },
          this.em,
          session
        )
      );

    return this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      paymentLinkEntity
    );
  }

  async getPaymentLink({ id }: IdDto): Promise<Dto['PaymentLinkDtoMapper']> {
    const databasePaymentLink =
      await this.basePaymentLinkService.getPaymentLink({ id });
    return {
      ...this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
        this.schemaValidator,
        databasePaymentLink
      ),
      stripeFields: await this.stripeClient.paymentLinks.retrieve(id)
    };
  }

  async expirePaymentLink({ id }: IdDto): Promise<void> {
    await this.stripeClient.paymentLinks.update(id, {
      metadata: {
        status: 'EXPIRED'
      }
    });
    await this.basePaymentLinkService.expirePaymentLink({ id });
  }

  async handlePaymentSuccess({ id }: IdDto): Promise<void> {
    await this.stripeClient.paymentLinks.update(id, {
      metadata: {
        status: 'COMPLETED'
      }
    });
    await this.basePaymentLinkService.handlePaymentSuccess({ id });
  }

  async handlePaymentFailure({ id }: IdDto): Promise<void> {
    await this.stripeClient.paymentLinks.update(id, {
      metadata: {
        status: 'FAILED'
      }
    });
    await this.basePaymentLinkService.handlePaymentFailure({ id });
  }

  async listPaymentLinks(
    idsDto?: IdsDto
  ): Promise<Dto['PaymentLinkDtoMapper'][]> {
    const paymentLinks = await this.stripeClient.paymentLinks.list({
      active: true
    });
    return await Promise.all(
      (await this.basePaymentLinkService.listPaymentLinks(idsDto)).map(
        async (paymentLink) => ({
          ...(await this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
            this.schemaValidator,
            paymentLink
          )),
          stripeFields: paymentLinks.data.find(
            (paymentLink) => paymentLink.id === paymentLink.id
          )
        })
      )
    );
  }
}
