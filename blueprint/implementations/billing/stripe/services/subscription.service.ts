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
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enums/billingProvider.enum';
import {
  StripeCreateSubscriptionDto,
  StripeSubscriptionDto,
  StripeSubscriptionDtos,
  StripeUpdateSubscriptionDto
} from '../types/stripe.dto.types';
import { StripeSubscriptionEntities } from '../types/stripe.entity.types';

export class StripeSubscriptionService<
  SchemaValidator extends AnySchemaValidator,
  PartyType,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends
    StripeSubscriptionDtos<PartyType> = StripeSubscriptionDtos<PartyType>,
  Entities extends
    StripeSubscriptionEntities<PartyType> = StripeSubscriptionEntities<PartyType>
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
    Metrics,
    Entities,
    Entities
  >;
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>
  >;

  constructor(
    protected readonly stripe: Stripe,
    protected readonly em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      SubscriptionDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['SubscriptionDtoMapper'],
        Entities['SubscriptionDtoMapper']
      >;
      CreateSubscriptionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateSubscriptionDtoMapper'],
        Entities['CreateSubscriptionDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['CreateSubscriptionDtoMapper'],
          em?: EntityManager,
          subscription?: Stripe.Subscription
        ) => Promise<Entities['CreateSubscriptionDtoMapper']>
      >;
      UpdateSubscriptionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateSubscriptionDtoMapper'],
        Entities['UpdateSubscriptionDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['UpdateSubscriptionDtoMapper'],
          em?: EntityManager,
          subscription?: Stripe.Subscription
        ) => Promise<Entities['UpdateSubscriptionDtoMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.baseSubscriptionService = new BaseSubscriptionService(
      em,
      openTelemetryCollector,
      schemaValidator,
      {
        SubscriptionDtoMapper: IdentityResponseMapper<
          Entities['SubscriptionDtoMapper'],
          SchemaValidator
        >,
        CreateSubscriptionDtoMapper: IdentityRequestMapper<
          Entities['CreateSubscriptionDtoMapper'],
          SchemaValidator
        >,
        UpdateSubscriptionDtoMapper: IdentityRequestMapper<
          Entities['UpdateSubscriptionDtoMapper'],
          SchemaValidator
        >
      },
      options
    );
  }

  async createSubscription(
    subscriptionDto: Dto['CreateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
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
        await this._mappers.CreateSubscriptionDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,
          {
            ...subscriptionDto,
            externalId: subscription.id,
            billingProvider: 'stripe'
          },
          em,
          subscription
        ),
        em
      );

    return this._mappers.SubscriptionDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      subscriptionEntity
    );
  }

  async getSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    return {
      ...(await this._mappers.SubscriptionDtoMapper.serializeEntityToDto(
        this.schemaValidator,
        await this.baseSubscriptionService.getSubscription(idDto, em)
      )),
      stripeFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async getUserSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    return {
      ...(await this._mappers.SubscriptionDtoMapper.serializeEntityToDto(
        this.schemaValidator,
        await this.baseSubscriptionService.getUserSubscription(idDto, em)
      )),
      stripeFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async getOrganizationSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
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
      ...(await this._mappers.SubscriptionDtoMapper.serializeEntityToDto(
        this.schemaValidator,
        await this.baseSubscriptionService.getOrganizationSubscription(
          { id },
          em
        )
      )),
      stripeFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async updateSubscription(
    subscriptionDto: Dto['UpdateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
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
        await this._mappers.UpdateSubscriptionDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,

          {
            ...subscriptionDto,
            externalId: subscription.id,
            billingProvider: 'stripe',
            providerFields: subscription
          },
          em,
          subscription
        ),
        em
      );

    return this._mappers.SubscriptionDtoMapper.serializeEntityToDto(
      this.schemaValidator,
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
  ): Promise<Dto['SubscriptionDtoMapper'][]> {
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
            ...(await this._mappers.SubscriptionDtoMapper.serializeEntityToDto(
              this.schemaValidator,
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
