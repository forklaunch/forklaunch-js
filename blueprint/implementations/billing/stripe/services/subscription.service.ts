import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BaseSubscriptionService } from '@forklaunch/implementation-billing-base/services';
import { SubscriptionService } from '@forklaunch/interfaces-billing/interfaces';
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
import { BillingProviderEnum } from '../domain/enum/billingProvider.enum';
import {
  StripeCreateSubscriptionDto,
  StripeSubscriptionDto,
  StripeSubscriptionDtos,
  StripeUpdateSubscriptionDto
} from '../domain/types/stripe.dto.types';
import { StripeSubscriptionEntities } from '../domain/types/stripe.entity.types';

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
    typeof BillingProviderEnum,
    Entities,
    Entities
  >;
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;

  constructor(
    protected readonly stripe: Stripe,
    protected readonly em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      SubscriptionMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['SubscriptionMapper'],
        Entities['SubscriptionMapper']
      >;
      CreateSubscriptionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreateSubscriptionMapper'],
        Entities['CreateSubscriptionMapper'],
        (
          dto: Dto['CreateSubscriptionMapper'],
          em: EntityManager,
          subscription: Stripe.Subscription
        ) => Promise<Entities['CreateSubscriptionMapper']>
      >;
      UpdateSubscriptionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateSubscriptionMapper'],
        Entities['UpdateSubscriptionMapper'],
        (
          dto: Dto['UpdateSubscriptionMapper'],
          em: EntityManager,
          subscription: Stripe.Subscription
        ) => Promise<Entities['UpdateSubscriptionMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.baseSubscriptionService = new BaseSubscriptionService(
      em,
      openTelemetryCollector,
      schemaValidator,
      {
        SubscriptionMapper: IdentityResponseMapper<
          Entities['SubscriptionMapper']
        >,
        CreateSubscriptionMapper: IdentityRequestMapper<
          Entities['CreateSubscriptionMapper']
        >,
        UpdateSubscriptionMapper: IdentityRequestMapper<
          Entities['UpdateSubscriptionMapper']
        >
      },
      options
    );
  }

  async createSubscription(
    subscriptionDto: Dto['CreateSubscriptionMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const subscription = await this.stripe.subscriptions.create({
      ...subscriptionDto.stripeFields,
      customer: subscriptionDto.partyId,
      items: [
        {
          plan: subscriptionDto.productId
        }
      ]
    });

    const subscriptionEntity =
      await this.baseSubscriptionService.createSubscription(
        await this._mappers.CreateSubscriptionMapper.deserializeDtoToEntity(
          {
            ...subscriptionDto,
            externalId: subscription.id,
            billingProvider: 'stripe'
          },
          em ?? this.em,
          subscription
        ),
        em
      );

    return this._mappers.SubscriptionMapper.serializeEntityToDto(
      subscriptionEntity
    );
  }

  async getSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    return {
      ...(await this._mappers.SubscriptionMapper.serializeEntityToDto(
        await this.baseSubscriptionService.getSubscription(idDto, em)
      )),
      stripeFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async getUserSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    return {
      ...(await this._mappers.SubscriptionMapper.serializeEntityToDto(
        await this.baseSubscriptionService.getUserSubscription(idDto, em)
      )),
      stripeFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
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
    return {
      ...(await this._mappers.SubscriptionMapper.serializeEntityToDto(
        await this.baseSubscriptionService.getOrganizationSubscription(
          { id },
          em
        )
      )),
      stripeFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async updateSubscription(
    subscriptionDto: Dto['UpdateSubscriptionMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    const subscription = await this.stripe.subscriptions.update(
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

    const subscriptionEntity =
      await this.baseSubscriptionService.updateSubscription(
        await this._mappers.UpdateSubscriptionMapper.deserializeDtoToEntity(
          {
            ...subscriptionDto,
            externalId: subscription.id,
            billingProvider: 'stripe',
            providerFields: subscription
          },
          em ?? this.em,
          subscription
        ),
        em
      );

    return this._mappers.SubscriptionMapper.serializeEntityToDto(
      subscriptionEntity
    );
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    await this.stripe.subscriptions.cancel(idDto.id);
    await this.baseSubscriptionService.deleteSubscription(idDto, em);
  }

  async listSubscriptions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper'][]> {
    const subscriptions = (
      await this.stripe.subscriptions.list({
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
          return {
            ...(await this._mappers.SubscriptionMapper.serializeEntityToDto(
              subscription
            )),
            stripeFields: subscriptions.find(
              (s) => s.id === subscription.externalId
            )
          };
        }
      )
    );
  }

  async cancelSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    await this.stripe.subscriptions.cancel(idDto.id);
    await this.baseSubscriptionService.cancelSubscription(idDto, em);
  }

  async resumeSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    await this.stripe.subscriptions.resume(idDto.id);
    await this.baseSubscriptionService.resumeSubscription(idDto, em);
  }
}
