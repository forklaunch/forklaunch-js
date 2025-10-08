import { IdDto, IdsDto } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BasePlanService } from '@forklaunch/implementation-billing-base/services';
import { PlanMappers } from '@forklaunch/implementation-billing-base/types';
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enum/billingProvider.enum';
import { CurrencyEnum } from '../domain/enum/currency.enum';
import { PlanCadenceEnum } from '../domain/enum/planCadence.enum';
import { StripePlanMappers } from '../domain/types/plan.mapper.types';
import {
  StripeCreatePlanDto,
  StripePlanDto,
  StripePlanDtos,
  StripeUpdatePlanDto
} from '../domain/types/stripe.dto.types';
import { StripePlanEntities } from '../domain/types/stripe.entity.types';

export class StripePlanService<
  SchemaValidator extends AnySchemaValidator,
  Entities extends StripePlanEntities,
  Dto extends StripePlanDtos = StripePlanDtos
> implements
    PlanService<
      typeof PlanCadenceEnum,
      typeof CurrencyEnum,
      typeof BillingProviderEnum,
      {
        CreatePlanDto: StripeCreatePlanDto;
        UpdatePlanDto: StripeUpdatePlanDto;
        PlanDto: StripePlanDto;
        IdDto: IdDto;
        IdsDto: IdsDto;
      }
    >
{
  basePlanService: BasePlanService<
    SchemaValidator,
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum,
    Entities,
    Dto
  >;
  protected readonly stripeClient: Stripe;
  protected readonly em: EntityManager;
  protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected readonly schemaValidator: SchemaValidator;
  protected readonly mappers: StripePlanMappers<Entities, Dto>;

  constructor(
    stripeClient: Stripe,
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: StripePlanMappers<Entities, Dto>,
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    this.stripeClient = stripeClient;
    this.em = em;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this.basePlanService = new BasePlanService(
      em,
      openTelemetryCollector,
      schemaValidator,
      mappers as PlanMappers<
        PlanCadenceEnum,
        CurrencyEnum,
        BillingProviderEnum,
        Entities,
        Dto
      >,
      options
    );
  }

  async createPlan(
    planDto: StripeCreatePlanDto,
    em?: EntityManager
  ): Promise<Dto['PlanMapper']> {
    const stripePlan = await this.stripeClient.plans.create({
      ...planDto.stripeFields,
      amount: planDto.price,
      interval: planDto.cadence,
      product: planDto.name,
      currency: planDto.currency as string
    });

    const plan = await this.basePlanService.createPlan(
      {
        ...planDto,
        externalId: stripePlan.id,
        billingProvider: 'stripe'
      },
      em ?? this.em,
      stripePlan
    );

    return plan;
  }

  async getPlan(idDto: IdDto, em?: EntityManager): Promise<Dto['PlanMapper']> {
    const planEntity = await this.basePlanService.getPlan(idDto, em);
    if (!planEntity.externalId) {
      throw new Error('Plan not found');
    }
    const plan = await this.stripeClient.plans.retrieve(planEntity.externalId);
    planEntity.stripeFields = plan;
    return planEntity;
  }

  async updatePlan(
    planDto: StripeUpdatePlanDto,
    em?: EntityManager
  ): Promise<Dto['PlanMapper']> {
    const planEntity = await this.basePlanService.getPlan(
      {
        id: planDto.id
      },
      em
    );

    const existingPlan = await this.stripeClient.plans.retrieve(
      planEntity.externalId
    );

    const existingProduct = existingPlan.product;
    if (!existingProduct) {
      throw new Error('Plan product not found');
    }

    const productId =
      typeof existingProduct === 'string'
        ? existingProduct
        : existingProduct.id;

    await this.stripeClient.plans.del(planEntity.externalId);
    const updatedPlan = await this.stripeClient.plans.create({
      ...planDto.stripeFields,
      interval: planDto.cadence ?? existingPlan.interval,
      currency: planDto.currency ?? existingPlan.currency,
      amount: planDto.price ?? existingPlan.amount ?? undefined,
      product: productId
    });

    const updatedPlanEntity = await this.basePlanService.updatePlan(
      {
        ...planDto,
        externalId: updatedPlan.id,
        name: planDto.name,
        billingProvider: 'stripe'
      },
      em,
      updatedPlan
    );

    updatedPlanEntity.stripeFields = updatedPlan;

    return updatedPlanEntity;
  }

  async deletePlan(idDto: IdDto, em?: EntityManager): Promise<void> {
    const plan = await this.basePlanService.getPlan(idDto, em);
    if (!plan.externalId) {
      throw new Error('Plan not found');
    }
    await this.stripeClient.plans.del(plan.externalId);
    await this.basePlanService.deletePlan(idDto, em);
  }

  async listPlans(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PlanMapper'][]> {
    const plans = await this.basePlanService.listPlans(idsDto, em);

    if (!plans || plans.length === 0) {
      return [];
    }

    const stripePlans = await Promise.all(
      plans.map(async (plan) => {
        try {
          return await this.stripeClient.plans.retrieve(plan.externalId);
        } catch {
          return null;
        }
      })
    );

    return plans
      .map((plan, index) => ({
        ...plan,
        stripeFields: stripePlans[index]
      }))
      .filter((plan) => plan.stripeFields !== null);
  }
}
