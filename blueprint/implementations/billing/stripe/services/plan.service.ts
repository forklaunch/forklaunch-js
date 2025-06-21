import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BasePlanService } from '@forklaunch/implementation-billing-base/services';
import { PlanService } from '@forklaunch/interfaces-billing/interfaces';
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
import { CurrencyEnum } from '../domain/enum/currency.enum';
import { PlanCadenceEnum } from '../domain/enum/planCadence.enum';
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
    typeof PlanCadenceEnum,
    typeof CurrencyEnum,
    typeof BillingProviderEnum,
    Entities,
    Entities
  >;
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;

  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PlanMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['PlanMapper'],
        Entities['PlanMapper']
      >;
      CreatePlanMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreatePlanMapper'],
        Entities['CreatePlanMapper'],
        (
          dto: Dto['CreatePlanMapper'],
          em: EntityManager,
          plan: Stripe.Plan
        ) => Promise<Entities['CreatePlanMapper']>
      >;
      UpdatePlanMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdatePlanMapper'],
        Entities['UpdatePlanMapper'],
        (
          dto: Dto['UpdatePlanMapper'],
          em: EntityManager,
          plan: Stripe.Plan
        ) => Promise<Entities['UpdatePlanMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.basePlanService = new BasePlanService(
      em,
      openTelemetryCollector,
      schemaValidator,
      {
        PlanMapper: IdentityResponseMapper<Entities['PlanMapper']>,
        CreatePlanMapper: IdentityRequestMapper<Entities['CreatePlanMapper']>,
        UpdatePlanMapper: IdentityRequestMapper<Entities['UpdatePlanMapper']>
      },
      options
    );
  }

  async createPlan(
    planDto: Dto['CreatePlanMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanMapper']> {
    const plan = await this.stripeClient.plans.create({
      ...planDto.stripeFields,
      interval: planDto.cadence,
      product: planDto.name,
      currency: planDto.currency as string
    });

    const planEntity = await this.basePlanService.createPlan(
      await this._mappers.CreatePlanMapper.deserializeDtoToEntity(
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

    return this._mappers.PlanMapper.serializeEntityToDto(planEntity);
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
    return {
      ...(await this._mappers.PlanMapper.serializeEntityToDto(
        await this.basePlanService.getPlan({ id }, em)
      )),
      stripeFields: plan
    };
  }

  async updatePlan(
    planDto: Dto['UpdatePlanMapper'],
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
      await this._mappers.UpdatePlanMapper.deserializeDtoToEntity(
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

    return this._mappers.PlanMapper.serializeEntityToDto(planEntity);
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
    const ids = (
      await em?.findAll<{ id: string; externalId: string }>(
        this.options?.databaseTableName ?? 'plan',
        { where: { externalId: { $in: plans.data.map((plan) => plan.id) } } }
      )
    )
      ?.filter((s) => idsDto?.ids?.includes(s.id))
      ?.map((s) => s.id);

    if (!ids) {
      throw new Error('Plans not found');
    }
    return await Promise.all(
      (await this.basePlanService.listPlans({ ids }, em)).map(async (plan) => ({
        ...(await this._mappers.PlanMapper.serializeEntityToDto(plan)),
        stripeFields: plans.data.find(
          (stripePlan) => stripePlan.id === plan.externalId
        )
      }))
    );
  }
}
