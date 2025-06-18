import { IdDto, IdsDto } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import {
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor
} from '@forklaunch/core/mappers';
import { BaseSubscriptionService } from '@forklaunch/implementation-billing-base/services';
import { SubscriptionService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import {
  StripeCreateSubscriptionDto,
  StripeSubscriptionDto,
  StripeUpdateSubscriptionDto
} from '../types/stripe.types';

export class StripeSubscriptionService<
    SchemaValidator extends AnySchemaValidator,
    PartyType,
    Metrics extends MetricsDefinition = MetricsDefinition,
    Dto extends {
      SubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
      CreateSubscriptionDtoMapper: StripeCreateSubscriptionDto<PartyType>;
      UpdateSubscriptionDtoMapper: StripeUpdateSubscriptionDto<PartyType>;
    } = {
      SubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
      CreateSubscriptionDtoMapper: StripeCreateSubscriptionDto<PartyType>;
      UpdateSubscriptionDtoMapper: StripeUpdateSubscriptionDto<PartyType>;
    },
    Entities extends {
      SubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
      CreateSubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
      UpdateSubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
    } = {
      SubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
      CreateSubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
      UpdateSubscriptionDtoMapper: StripeSubscriptionDto<PartyType>;
    }
  >
  extends BaseSubscriptionService<
    SchemaValidator,
    PartyType,
    { stripe: 'stripe' },
    Metrics,
    Dto,
    Entities
  >
  implements
    SubscriptionService<
      PartyType,
      { stripe: 'stripe' },
      {
        CreateSubscriptionDto: StripeCreateSubscriptionDto<PartyType>;
        UpdateSubscriptionDto: StripeUpdateSubscriptionDto<PartyType>;
        SubscriptionDto: StripeSubscriptionDto<PartyType>;
        IdDto: IdDto;
        IdsDto: IdsDto;
      }
    >
{
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
        Entities['CreateSubscriptionDtoMapper']
      >;
      UpdateSubscriptionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateSubscriptionDtoMapper'],
        Entities['UpdateSubscriptionDtoMapper']
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    super(em, openTelemetryCollector, schemaValidator, mappers, options);
  }

  async createSubscription(
    subscriptionDto: Dto['CreateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription = await this.stripe.subscriptions.create({
      ...subscriptionDto.extraFields,
      customer: subscriptionDto.partyId,
      items: [
        {
          plan: subscriptionDto.productId
        }
      ]
    });
    return super.createSubscription(
      {
        ...subscriptionDto,
        externalId: subscription.id,
        billingProvider: 'stripe',
        extraFields: subscription
      },
      em
    );
  }

  async getSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    return {
      ...(await super.getSubscription(idDto, em)),
      extraFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async getUserSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    return {
      ...(await super.getUserSubscription(idDto, em)),
      extraFields: await this.stripe.subscriptions.retrieve(idDto.id)
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
      ...(await super.getOrganizationSubscription({ id }, em)),
      extraFields: await this.stripe.subscriptions.retrieve(idDto.id)
    };
  }

  async updateSubscription(
    subscriptionDto: Dto['UpdateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription = await this.stripe.subscriptions.update(
      subscriptionDto.id,
      {
        ...subscriptionDto.extraFields,
        items: [
          {
            plan: subscriptionDto.productId
          }
        ]
      }
    );
    return super.updateSubscription(
      {
        ...subscriptionDto,
        externalId: subscription.id,
        billingProvider: 'stripe',
        extraFields: subscription
      },
      em
    );
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    await this.stripe.subscriptions.cancel(idDto.id);
    await super.deleteSubscription(idDto, em);
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

    return (await super.listSubscriptions({ ids }, em)).map((subscription) => {
      return {
        ...subscription,
        extraFields: subscriptions.find((s) => s.id === subscription.externalId)
      };
    });
  }

  async cancelSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    await this.stripe.subscriptions.cancel(idDto.id);
    await super.cancelSubscription(idDto, em);
  }

  async resumeSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    await this.stripe.subscriptions.resume(idDto.id);
    await super.resumeSubscription(idDto, em);
  }
}
