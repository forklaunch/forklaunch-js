import { IdDto, IdsDto } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BaseSubscriptionService } from '@forklaunch/implementation-billing-base/services';
import { SubscriptionMappers } from '@forklaunch/implementation-billing-base/types';
import { SubscriptionService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enum/billingProvider.enum';
import {
  StripeCreateSubscriptionDto,
  StripeSubscriptionDto,
  StripeSubscriptionDtos,
  StripeUpdateSubscriptionDto
} from '../domain/types/stripe.dto.types';
import { StripeSubscriptionEntities } from '../domain/types/stripe.entity.types';
import { StripeSubscriptionMappers } from '../domain/types/subscription.mapper.types';

export class StripeSubscriptionService<
  SchemaValidator extends AnySchemaValidator,
  PartyType,
  Entities extends StripeSubscriptionEntities<PartyType>,
  Dto extends
    StripeSubscriptionDtos<PartyType> = StripeSubscriptionDtos<PartyType>
> implements
    SubscriptionService<
      PartyType,
      typeof BillingProviderEnum,
      {
        CreateSubscriptionDto: StripeCreateSubscriptionDto<PartyType>;
        UpdateSubscriptionDto: StripeUpdateSubscriptionDto<PartyType>;
        SubscriptionDto: StripeSubscriptionDto<PartyType>;
        IdDto: IdDto;
        IdsDto: IdsDto;
      }
    >
{
  baseSubscriptionService: BaseSubscriptionService<
    SchemaValidator,
    PartyType,
    BillingProviderEnum,
    Entities,
    Dto
  >;
  protected readonly stripeClient: Stripe;
  protected readonly em: EntityManager;
  protected readonly cache: TtlCache;
  protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected readonly schemaValidator: SchemaValidator;
  protected readonly mappers: StripeSubscriptionMappers<
    PartyType,
    Entities,
    Dto
  >;

  constructor(
    stripeClient: Stripe,
    em: EntityManager,
    cache: TtlCache,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: StripeSubscriptionMappers<PartyType, Entities, Dto>,
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    this.stripeClient = stripeClient;
    this.em = em;
    this.cache = cache;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this.baseSubscriptionService = new BaseSubscriptionService(
      em,
      openTelemetryCollector,
      schemaValidator,
      mappers as SubscriptionMappers<
        PartyType,
        BillingProviderEnum,
        Entities,
        Dto
      >,
      options
    );
  }

  async createSubscription(
    subscriptionDto: StripeCreateSubscriptionDto<PartyType>,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const subscription = await this.stripeClient.subscriptions.create({
      ...subscriptionDto.stripeFields,
      customer: subscriptionDto.partyId,
      items: [
        {
          plan: subscriptionDto.productId
        }
      ]
    });

    return await this.baseSubscriptionService.createSubscription(
      {
        ...subscriptionDto,
        externalId: subscription.id,
        billingProvider: 'stripe'
      },
      em ?? this.em,
      subscription
    );
  }

  async getSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const subscriptionEntity =
      await this.baseSubscriptionService.getSubscription(idDto, em);
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(
      idDto.id
    );
    subscriptionEntity.stripeFields = stripeSubscription;
    return subscriptionEntity;
  }

  async getUserSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const subscriptionEntity =
      await this.baseSubscriptionService.getUserSubscription(idDto, em);
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(
      idDto.id
    );
    subscriptionEntity.stripeFields = stripeSubscription;
    return subscriptionEntity;
  }

  async getOrganizationSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const id = (
      await em?.findOne<{ id: string; externalId: string }>(
        this.options?.databaseTableName ?? 'subscription',
        { externalId: idDto.id }
      )
    )?.id;
    if (!id) {
      throw new Error('Subscription not found');
    }
    const subscriptionEntity =
      await this.baseSubscriptionService.getOrganizationSubscription(
        { id },
        em
      );
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(
      idDto.id
    );
    subscriptionEntity.stripeFields = stripeSubscription;
    return subscriptionEntity;
  }

  async updateSubscription(
    subscriptionDto: StripeUpdateSubscriptionDto<PartyType>,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const subscription = await this.stripeClient.subscriptions.update(
      subscriptionDto.id,
      {
        ...subscriptionDto.stripeFields,
        items: [
          {
            plan: subscriptionDto.productId
          }
        ]
      }
    );

    return await this.baseSubscriptionService.updateSubscription(
      {
        ...subscriptionDto,
        externalId: subscription.id,
        billingProvider: 'stripe',
        providerFields: subscription
      },
      em ?? this.em,
      subscription
    );
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    await this.stripeClient.subscriptions.cancel(idDto.id);
    await this.baseSubscriptionService.deleteSubscription(idDto, em);
  }

  async listSubscriptions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper'][]> {
    const subscriptions = (
      await this.stripeClient.subscriptions.list({
        status: 'active'
      })
    ).data.filter((s) => idsDto.ids?.includes(s.id));

    const ids = (
      await em?.findAll<{ id: string; externalId: string }>(
        this.options?.databaseTableName ?? 'subscription',
        { where: { externalId: { $in: subscriptions.map((s) => s.id) } } }
      )
    )?.map((s) => s.id);

    if (!ids) {
      throw new Error('Subscriptions not found');
    }

    return await Promise.all(
      (await this.baseSubscriptionService.listSubscriptions({ ids }, em)).map(
        async (subscription) => {
          const stripeSubscription = subscriptions.find(
            (s) => s.id === subscription.externalId
          )!;
          subscription.stripeFields = stripeSubscription;
          return subscription;
        }
      )
    );
  }

  async cancelSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    await this.stripeClient.subscriptions.cancel(idDto.id);
    await this.baseSubscriptionService.cancelSubscription(idDto, em);
  }

  async resumeSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    await this.stripeClient.subscriptions.resume(idDto.id);
    await this.baseSubscriptionService.resumeSubscription(idDto, em);
  }
}
