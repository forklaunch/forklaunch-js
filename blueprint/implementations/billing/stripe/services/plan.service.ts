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
import { BasePlanService } from '@forklaunch/implementation-billing-base/services';
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PlanCadenceEnum } from '../domain/enums/planCadence.enum';
import {
  StripeCreatePlanDto,
  StripePlanDto,
  StripeUpdatePlanDto
} from '../types/stripe.types';

export class StripePlanService<
    SchemaValidator extends AnySchemaValidator,
    Metrics extends MetricsDefinition = MetricsDefinition,
    Dto extends {
      PlanDtoMapper: StripePlanDto;
      CreatePlanDtoMapper: StripeCreatePlanDto;
      UpdatePlanDtoMapper: StripeUpdatePlanDto;
    } = {
      PlanDtoMapper: StripePlanDto;
      CreatePlanDtoMapper: StripeCreatePlanDto;
      UpdatePlanDtoMapper: StripeUpdatePlanDto;
    },
    Entities extends {
      PlanDtoMapper: StripePlanDto;
      CreatePlanDtoMapper: StripePlanDto;
      UpdatePlanDtoMapper: StripePlanDto;
    } = {
      PlanDtoMapper: StripePlanDto;
      CreatePlanDtoMapper: StripePlanDto;
      UpdatePlanDtoMapper: StripePlanDto;
    }
  >
  extends BasePlanService<
    SchemaValidator,
    typeof PlanCadenceEnum,
    typeof CurrencyEnum,
    { stripe: 'stripe' },
    Metrics,
    Dto,
    Entities
  >
  implements
    PlanService<
      typeof PlanCadenceEnum,
      typeof CurrencyEnum,
      { stripe: 'stripe' },
      {
        CreatePlanDto: StripeCreatePlanDto;
        UpdatePlanDto: StripeUpdatePlanDto;
        PlanDto: StripePlanDto;
        IdDto: IdDto;
        IdsDto: IdsDto;
      }
    >
{
  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PlanDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['PlanDtoMapper'],
        Entities['PlanDtoMapper']
      >;
      CreatePlanDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreatePlanDtoMapper'],
        Entities['CreatePlanDtoMapper']
      >;
      UpdatePlanDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePlanDtoMapper'],
        Entities['UpdatePlanDtoMapper']
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    super(em, openTelemetryCollector, schemaValidator, mappers, options);
  }

  async createPlan(
    planDto: Dto['CreatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan = await this.stripeClient.plans.create({
      ...planDto.extraFields,
      interval: planDto.cadence,
      product: planDto.name,
      currency: planDto.currency as string
    });
    return super.createPlan(
      {
        ...planDto,
        externalId: plan.id,
        billingProvider: 'stripe',
        extraFields: plan
      },
      em
    );
  }

  async getPlan(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
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
    return {
      ...(await super.getPlan({ id }, em)),
      extraFields: plan
    };
  }

  async updatePlan(
    planDto: Dto['UpdatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const existingPlan = await this.stripeClient.plans.retrieve(planDto.id);
    const plan = await this.stripeClient.plans.del(planDto.id).then(() =>
      this.stripeClient.plans.create({
        ...planDto.extraFields,
        interval: planDto.cadence ?? existingPlan.interval,
        product: planDto.name,
        currency: planDto.currency ?? existingPlan.currency
      })
    );
    return super.updatePlan(
      {
        ...planDto,
        externalId: plan.id,
        billingProvider: 'stripe',
        extraFields: plan
      },
      em
    );
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    await this.stripeClient.plans.del(idDto.id);
    await super.deletePlan(idDto, em);
  }

  async listPlans(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper'][]> {
    const plans = await this.stripeClient.plans.list({
      active: true
    });
    const ids = (
      await em?.findAll<{ id: string; externalId: string }>(
        this.options?.databaseTableName ?? 'plan',
        { where: { externalId: { $in: plans.data.map((plan) => plan.id) } } }
      )
    )?.map((s) => s.id);

    if (!ids) {
      throw new Error('Plans not found');
    }
    return (await super.listPlans({ ids }, em)).map((plan) => ({
      ...plan,
      extraFields: plans.data.find(
        (stripePlan) => stripePlan.id === plan.externalId
      )
    }));
  }
}
