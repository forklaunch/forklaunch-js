import { IdDto, IdsDto } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
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
  protected readonly cache: TtlCache;
  protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected readonly schemaValidator: SchemaValidator;
  protected readonly mappers: StripePlanMappers<Entities, Dto>;

  constructor(
    stripeClient: Stripe,
    em: EntityManager,
    cache: TtlCache,
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
    this.cache = cache;
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
    const plan = await this.stripeClient.plans.retrieve(idDto.id);
    const id = (
      await em?.findOne<{ id: string; externalId: string }>(
        this.options?.databaseTableName ?? 'plan',
        { externalId: idDto.id }
      )
    )?.id;
    if (!id) {
      throw new Error('Plan not found');
    }
    const planEntity = await this.basePlanService.getPlan({ id }, em);
    planEntity.stripeFields = plan;
    return planEntity;
  }

  async updatePlan(
    planDto: StripeUpdatePlanDto,
    em?: EntityManager
  ): Promise<Dto['PlanMapper']> {
    const existingPlan = await this.stripeClient.plans.retrieve(planDto.id);
    const plan = await this.stripeClient.plans.del(planDto.id).then(() =>
      this.stripeClient.plans.create({
        ...planDto.stripeFields,
        interval: planDto.cadence ?? existingPlan.interval,
        product: planDto.name,
        currency: planDto.currency ?? existingPlan.currency
      })
    );

    const planEntity = await this.basePlanService.updatePlan(
      await this.mappers.UpdatePlanMapper.toEntity(
        {
          ...planDto,
          externalId: plan.id,
          billingProvider: 'stripe'
        },
        em ?? this.em,
        plan
      ),
      em
    );
    planEntity.stripeFields = plan;

    return planEntity;
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    await this.stripeClient.plans.del(idDto.id);
    await this.basePlanService.deletePlan(idDto, em);
  }

  async listPlans(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PlanMapper'][]> {
    const plans = await this.stripeClient.plans.list({
      active: true
    });
    const planIds = (
      await em?.findAll<{ id: string; externalId: string }>(
        this.options?.databaseTableName ?? 'plan',
        { where: { externalId: { $in: plans.data.map((plan) => plan.id) } } }
      )
    )
      ?.filter((s) => idsDto?.ids?.includes(s.id))
      ?.map((s) => s.id);

    if (!planIds) {
      throw new Error('Plans not found');
    }
    return await Promise.all(
      (await this.basePlanService.listPlans({ ids: planIds }, em)).map(
        async (plan) => ({
          ...plan,
          stripeFields: plans.data.find(
            (stripePlan) => stripePlan.id === plan.externalId
          )
        })
      )
    );
  }
}
