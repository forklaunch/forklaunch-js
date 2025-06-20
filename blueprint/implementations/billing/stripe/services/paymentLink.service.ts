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
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CurrencyEnum } from '../domain/enum/currency.enum';
import { PaymentMethodEnum } from '../domain/enum/paymentMethod.enum';
import {
  StripeCreatePaymentLinkDto,
  StripePaymentLinkDto,
  StripePaymentLinkDtos,
  StripeUpdatePaymentLinkDto
} from '../domain/types/stripe.dto.types';
import { StripePaymentLinkEntities } from '../domain/types/stripe.entity.types';

export class StripePaymentLinkService<
  SchemaValidator extends AnySchemaValidator,
  StatusEnum,
  Entities extends StripePaymentLinkEntities<StatusEnum>,
  Dto extends
    StripePaymentLinkDtos<StatusEnum> = StripePaymentLinkDtos<StatusEnum>
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
    Entities,
    Entities
  >;
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;

  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PaymentLinkMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['PaymentLinkMapper'],
        Entities['PaymentLinkMapper']
      >;
      CreatePaymentLinkMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreatePaymentLinkMapper'],
        Entities['CreatePaymentLinkMapper'],
        (
          dto: Dto['CreatePaymentLinkMapper'],
          em: EntityManager,
          paymentLink: Stripe.PaymentLink
        ) => Promise<Entities['CreatePaymentLinkMapper']>
      >;
      UpdatePaymentLinkMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdatePaymentLinkMapper'],
        Entities['UpdatePaymentLinkMapper'],
        (
          dto: Dto['UpdatePaymentLinkMapper'],
          em: EntityManager,
          paymentLink: Stripe.PaymentLink
        ) => Promise<Entities['UpdatePaymentLinkMapper']>
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.basePaymentLinkService = new BasePaymentLinkService(
      em,
      cache,
      openTelemetryCollector,
      schemaValidator,
      {
        PaymentLinkMapper: IdentityResponseMapper<
          Entities['PaymentLinkMapper']
        >,
        CreatePaymentLinkMapper: IdentityRequestMapper<
          Entities['CreatePaymentLinkMapper']
        >,
        UpdatePaymentLinkMapper: IdentityRequestMapper<
          Entities['UpdatePaymentLinkMapper']
        >
      },
      options
    );
  }

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkMapper']
  ): Promise<Dto['PaymentLinkMapper']> {
    const session = await this.stripeClient.paymentLinks.create({
      ...paymentLinkDto.stripeFields,
      payment_method_types: paymentLinkDto.paymentMethods,
      currency: paymentLinkDto.currency as string
    });

    const paymentLinkEntity =
      await this.basePaymentLinkService.createPaymentLink(
        await this._mappers.CreatePaymentLinkMapper.deserializeDtoToEntity(
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

    return this._mappers.PaymentLinkMapper.serializeEntityToDto(
      paymentLinkEntity
    );
  }

  async updatePaymentLink(
    paymentLinkDto: Dto['UpdatePaymentLinkMapper']
  ): Promise<Dto['PaymentLinkMapper']> {
    const session = await this.stripeClient.paymentLinks.update(
      paymentLinkDto.id,
      {
        ...paymentLinkDto.stripeFields,
        payment_method_types: paymentLinkDto.paymentMethods
      }
    );

    const paymentLinkEntity =
      await this.basePaymentLinkService.updatePaymentLink(
        await this._mappers.UpdatePaymentLinkMapper.deserializeDtoToEntity(
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

    return this._mappers.PaymentLinkMapper.serializeEntityToDto(
      paymentLinkEntity
    );
  }

  async getPaymentLink({ id }: IdDto): Promise<Dto['PaymentLinkMapper']> {
    const databasePaymentLink =
      await this.basePaymentLinkService.getPaymentLink({ id });
    return {
      ...this._mappers.PaymentLinkMapper.serializeEntityToDto(
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

  async listPaymentLinks(idsDto?: IdsDto): Promise<Dto['PaymentLinkMapper'][]> {
    const paymentLinks = await this.stripeClient.paymentLinks.list({
      active: true
    });
    return await Promise.all(
      (await this.basePaymentLinkService.listPaymentLinks(idsDto)).map(
        async (paymentLink) => ({
          ...(await this._mappers.PaymentLinkMapper.serializeEntityToDto(
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
