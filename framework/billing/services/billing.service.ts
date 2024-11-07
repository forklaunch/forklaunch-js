import { TtlCache } from '@forklaunch/core/cache';
import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { BillingService } from '../interfaces/billingService.interface';
import {
  CreatePaymentLinkDto,
  CreatePaymentLinkDtoMapper,
  PaymentLinkDto,
  PaymentLinkDtoMapper,
  UpdatePaymentLinkDto,
  UpdatePaymentLinkDtoMapper
} from '../models/dtoMapper/paymentLink.dtoMapper';
import {
  CreatePlanDto,
  CreatePlanDtoMapper,
  PlanDto,
  PlanDtoMapper,
  UpdatePlanDto,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';
import {
  CreateSessionDto,
  CreateSessionDtoMapper,
  SessionDto,
  SessionDtoMapper
} from '../models/dtoMapper/session.dtoMapper';
import {
  CreateSubscriptionDto,
  CreateSubscriptionDtoMapper,
  SubscriptionDto,
  SubscriptionDtoMapper,
  UpdateSubscriptionDto,
  UpdateSubscriptionDtoMapper
} from '../models/dtoMapper/subscription.dtoMapper';
import { Party } from '../models/enum/party.enum';
import { PaymentLink } from '../models/persistence/paymentLink.entity';
import { Plan } from '../models/persistence/plan.entity';
import { Session } from '../models/persistence/session.entity';
import { Subscription } from '../models/persistence/subscription.entity';

export class BaseBillingService implements BillingService {
  constructor(
    private em: EntityManager,
    private cache: TtlCache
  ) {}

  async listPlans(): Promise<PlanDto[]> {
    return await this.em.getRepository(Plan).findAll();
  }

  async createPlan(planDto: CreatePlanDto): Promise<PlanDto> {
    const plan = CreatePlanDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      planDto
    );
    await this.em.persistAndFlush(plan);
    return plan;
  }

  async getPlan(id: string): Promise<PlanDto> {
    return await this.em.findOneOrFail(Plan, { id });
  }

  async updatePlan(planDto: UpdatePlanDto): Promise<PlanDto> {
    const plan = UpdatePlanDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      planDto
    );
    const updatedPlan = await this.em.upsert(plan);
    await this.em.persistAndFlush(plan);
    const updatedPlanDto = PlanDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      updatedPlan
    );
    return updatedPlanDto;
  }

  async deletePlan(id: string): Promise<void> {
    await this.em.nativeDelete(Plan, { id });
  }

  async createCheckoutSession(
    sessionDto: CreateSessionDto
  ): Promise<SessionDto> {
    const session = CreateSessionDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      sessionDto
    );
    session.id = v4();

    // Store the session details in the cache
    await this.cache.putRecord({
      key: `checkout_session_${session.id}`,
      value: session,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const cachedSessionDetails = await this.cache.readRecord<Session>(
      `checkout_session_${session.id}`
    );
    const createdSessionDto = SessionDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      cachedSessionDetails.value
    );
    return createdSessionDto;
  }

  async getCheckoutSession(id: string): Promise<SessionDto> {
    const sessionDetails = await this.cache.readRecord<Session>(
      `checkout_session_${id}`
    );
    if (!sessionDetails) {
      throw new Error('Session not found');
    }
    return sessionDetails.value;
  }

  async expireCheckoutSession(id: string): Promise<void> {
    const sessionDetails = await this.cache.readRecord(
      `checkout_session_${id}`
    );
    if (!sessionDetails) {
      throw new Error('Session not found');
    }
    await this.cache.deleteRecord(`checkout_session_${id}`);
  }

  async handleCheckoutSuccess(id: string): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(`checkout_session_${id}`);
  }

  async handleCheckoutFailure(id: string): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(`checkout_session_${id}`);
  }

  // async createBillingPortalSession(params: any): Promise<BillingPortalDto> {
  //   const sessionId = uuidv4();
  //   const session = {
  //     id: sessionId,
  //     createdAt: new Date(),
  //     ...params
  //   };
  //   // Save the session to your database or external service
  //   await this.cache.putRecord({
  //     key: `billing_portal_session_${sessionId}`,
  //     value: session,
  //     ttlMilliseconds: this.cache.getTtlMilliseconds()
  //   });
  //   return session;
  // }

  // async getBillingPortalSession(id: string): Promise<BillingPortalDto> {
  //   const session = await this.cache.readRecord(`billing_portal_session_${id}`);
  //   if (!session) {
  //     throw new Error('Session not found');
  //   }
  //   return session;
  // }

  // async expireBillingPortalSession(id: string): Promise<void> {
  //   const sessionExists = await this.cache.readRecord(
  //     `billing_portal_session_${id}`
  //   );
  //   if (!sessionExists) {
  //     throw new Error('Session not found');
  //   }
  //   await this.cache.deleteRecord(`billing_portal_session_${id}`);
  //   return { message: 'Portal session deleted successfully', id };
  // }

  async createPaymentLink(
    paymentLinkDto: CreatePaymentLinkDto
  ): Promise<PaymentLinkDto> {
    // TODO:Perform permission checks here
    const linkId = v4();
    const paymentLink = CreatePaymentLinkDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      paymentLinkDto
    );
    await this.cache.putRecord({
      key: `payment_link_${linkId}`,
      value: paymentLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const createdPaymentLinkDto = PaymentLinkDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      paymentLink
    );

    return createdPaymentLinkDto;
  }

  async updatePaymentLink(
    paymentLinkDto: UpdatePaymentLinkDto
  ): Promise<PaymentLinkDto> {
    const cacheKey = `payment_link_${paymentLinkDto.id}`;
    const existingLink = await this.cache.readRecord<PaymentLink>(cacheKey);
    if (!existingLink) {
      throw new Error('Payment link not found');
    }
    const paymentLink = UpdatePaymentLinkDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      paymentLinkDto
    );
    const updatedLink = { ...existingLink, ...paymentLink };
    await this.cache.putRecord({
      key: cacheKey,
      value: updatedLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const updatedPaymentLinkDto = PaymentLinkDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      updatedLink
    );

    return updatedPaymentLinkDto;
  }

  async getPaymentLink(id: string): Promise<PaymentLinkDto> {
    const cacheKey = `payment_link_${id}`;
    const paymentLink = await this.cache.readRecord<PaymentLink>(cacheKey);
    if (!paymentLink) {
      throw new Error('Payment link not found');
    }
    const retrievedPaymentLink = PaymentLinkDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      paymentLink.value
    );

    return retrievedPaymentLink;
  }

  async listPaymentLinks(ids?: string[]): Promise<PaymentLinkDto[]> {
    // TODO: Perform admin permission checks here
    const keys =
      ids?.map((id) => `payment_link_${id}`) ??
      (await this.cache.listKeys('payment_link'));

    return await Promise.all(
      keys.map(async (key) => {
        const paymentLink = await this.cache.readRecord<PaymentLink>(key);
        const paymentLinkDto = PaymentLinkDtoMapper.serializeEntityToJson(
          SchemaValidator(),
          paymentLink.value
        );
        return paymentLinkDto;
      })
    );
  }

  async createSubscription(
    subscriptionDto: CreateSubscriptionDto
  ): Promise<SubscriptionDto> {
    const subscription = CreateSubscriptionDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      subscriptionDto
    );
    await this.em.persistAndFlush(subscription);
    const createdSubscriptionDto = SubscriptionDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      subscription
    );
    return createdSubscriptionDto;
  }

  async getSubscription(id: string): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      await this.em.findOneOrFail(Subscription, { id })
    );

    return subscription;
  }

  async getUserSubscription(id: string): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      await this.em.findOneOrFail(Subscription, {
        partyId: id,
        partyType: Party.USER,
        active: true
      })
    );

    return subscription;
  }

  async getOrganizationSubscription(id: string): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      await this.em.findOneOrFail(Subscription, {
        partyId: id,
        partyType: Party.ORGANIZATION,
        active: true
      })
    );

    return subscription;
  }

  async updateSubscription(
    subscriptionDto: UpdateSubscriptionDto
  ): Promise<SubscriptionDto> {
    const subscription = UpdateSubscriptionDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      subscriptionDto
    );
    const updatedSubscription = await this.em.upsert(subscription);
    await this.em.persistAndFlush(updatedSubscription);
    const updatedSubscriptionDto = SubscriptionDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      updatedSubscription
    );

    return updatedSubscriptionDto;
  }

  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.em.findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    await this.em.removeAndFlush(subscription);
  }

  async listSubscriptions(ids?: string[]): Promise<SubscriptionDto[]> {
    const subscriptions = await this.em.findAll(Subscription, {
      where: {
        id: {
          $in: ids
        }
      }
    });

    return subscriptions.map((subscription) => {
      const subscriptionDto = SubscriptionDtoMapper.serializeEntityToJson(
        SchemaValidator(),
        subscription
      );
      return subscriptionDto;
    });
  }

  async cancelSubscription(id: string): Promise<void> {
    const subscription = await this.em.findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    subscription.active = false;
    await this.em.persistAndFlush(subscription);
  }
  async resumeSubscription(id: string): Promise<void> {
    const subscription = await this.em.findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    subscription.active = true;
    await this.em.persistAndFlush(subscription);
  }
}
