import { IdDto, IdsDto } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import {
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor
} from '@forklaunch/core/mappers';
import { BasePaymentLinkService } from '@forklaunch/implementation-billing-base/services';
import { PaymentLinkService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import { StripePaymentLinkEntity } from '../types';
import {
  StripeCreatePaymentLinkDto,
  StripePaymentLinkDto,
  StripeUpdatePaymentLinkDto
} from '../types/stripe.dto.types';

export class StripePaymentLinkService<
    SchemaValidator extends AnySchemaValidator,
    StatusEnum,
    Metrics extends MetricsDefinition = MetricsDefinition,
    Dto extends {
      PaymentLinkDtoMapper: StripePaymentLinkDto<StatusEnum>;
      CreatePaymentLinkDtoMapper: StripeCreatePaymentLinkDto<StatusEnum>;
      UpdatePaymentLinkDtoMapper: StripeUpdatePaymentLinkDto<StatusEnum>;
    } = {
      PaymentLinkDtoMapper: StripePaymentLinkDto<StatusEnum>;
      CreatePaymentLinkDtoMapper: StripeCreatePaymentLinkDto<StatusEnum>;
      UpdatePaymentLinkDtoMapper: StripeUpdatePaymentLinkDto<StatusEnum>;
    },
    Entities extends {
      PaymentLinkDtoMapper: StripePaymentLinkEntity<StatusEnum>;
      CreatePaymentLinkDtoMapper: StripePaymentLinkEntity<StatusEnum>;
      UpdatePaymentLinkDtoMapper: StripePaymentLinkEntity<StatusEnum>;
    } = {
      PaymentLinkDtoMapper: StripePaymentLinkEntity<StatusEnum>;
      CreatePaymentLinkDtoMapper: StripePaymentLinkEntity<StatusEnum>;
      UpdatePaymentLinkDtoMapper: StripePaymentLinkEntity<StatusEnum>;
    }
  >
  extends BasePaymentLinkService<
    SchemaValidator,
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum,
    Metrics,
    Dto,
    Entities
  >
  implements
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
        Entities['CreatePaymentLinkDtoMapper']
      >;
      UpdatePaymentLinkDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePaymentLinkDtoMapper'],
        Entities['UpdatePaymentLinkDtoMapper']
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    super(em, cache, openTelemetryCollector, schemaValidator, mappers, options);
  }

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    const session = await this.stripeClient.paymentLinks.create({
      ...paymentLinkDto.stripeFields,
      payment_method_types: paymentLinkDto.paymentMethods,
      currency: paymentLinkDto.currency as string
    });

    return super.createPaymentLink({
      ...paymentLinkDto,
      id: session.id,
      amount:
        session.line_items?.data.reduce<number>(
          (total, item) => total + item.amount_total,
          0
        ) ?? 0,
      providerFields: session
    });
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

    return super.updatePaymentLink({
      ...paymentLinkDto,
      id: session.id,
      amount:
        session.line_items?.data.reduce<number>(
          (total, item) => total + item.amount_total,
          0
        ) ?? 0,
      providerFields: session
    });
  }

  async getPaymentLink({ id }: IdDto): Promise<Dto['PaymentLinkDtoMapper']> {
    const databasePaymentLink = await super.getPaymentLink({ id });
    return {
      ...databasePaymentLink,
      stripeFields: await this.stripeClient.paymentLinks.retrieve(id)
    };
  }

  async expirePaymentLink({ id }: IdDto): Promise<void> {
    await this.stripeClient.paymentLinks.update(id, {
      metadata: {
        status: 'EXPIRED'
      }
    });
    await super.expirePaymentLink({ id });
  }

  async handlePaymentSuccess({ id }: IdDto): Promise<void> {
    await this.stripeClient.paymentLinks.update(id, {
      metadata: {
        status: 'COMPLETED'
      }
    });
    await super.handlePaymentSuccess({ id });
  }

  async handlePaymentFailure({ id }: IdDto): Promise<void> {
    await this.stripeClient.paymentLinks.update(id, {
      metadata: {
        status: 'FAILED'
      }
    });
    await super.handlePaymentFailure({ id });
  }

  async listPaymentLinks(
    idsDto?: IdsDto
  ): Promise<Dto['PaymentLinkDtoMapper'][]> {
    const paymentLinks = await this.stripeClient.paymentLinks.list({
      active: true
    });
    return (await super.listPaymentLinks(idsDto)).map((paymentLink) => ({
      ...paymentLink,
      stripeFields: paymentLinks.data.find(
        (paymentLink) => paymentLink.id === paymentLink.id
      )
    }));
  }
}
