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
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enums/billingProvider.enum';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PlanCadenceEnum } from '../domain/enums/planCadence.enum';
import {
  StripeCreatePlanDto,
  StripePlanDto,
  StripePlanDtos,
  StripeUpdatePlanDto
} from '../types/stripe.dto.types';
import { StripePlanEntities } from '../types/stripe.entity.types';

export class StripePlanService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends StripePlanDtos = StripePlanDtos,
  Entities extends StripePlanEntities = StripePlanEntities
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
    Metrics,
    Entities,
    Entities
  >;
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>
  >;

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
        Entities['CreatePlanDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['CreatePlanDtoMapper'],
          em?: EntityManager,
          plan?: Stripe.Plan
        ) => Promise<Entities['CreatePlanDtoMapper']>
      >;
      UpdatePlanDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePlanDtoMapper'],
        Entities['UpdatePlanDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['UpdatePlanDtoMapper'],
          em?: EntityManager,
          plan?: Stripe.Plan
        ) => Promise<Entities['UpdatePlanDtoMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      databaseTableName?: string;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.basePlanService = new BasePlanService(
      em,
      openTelemetryCollector,
      schemaValidator,
      {
        PlanDtoMapper: IdentityResponseMapper<
          Entities['PlanDtoMapper'],
          SchemaValidator
        >,
        CreatePlanDtoMapper: IdentityRequestMapper<
          Entities['CreatePlanDtoMapper'],
          SchemaValidator
        >,
        UpdatePlanDtoMapper: IdentityRequestMapper<
          Entities['UpdatePlanDtoMapper'],
          SchemaValidator
        >
      },
      options
    );
  }

  async createPlan(
    planDto: Dto['CreatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
    const plan = await this.stripeClient.plans.create({
      ...planDto.stripeFields,
      interval: planDto.cadence,
      product: planDto.name,
      currency: planDto.currency as string
    });

    const planEntity = await this.basePlanService.createPlan(
      await this._mappers.CreatePlanDtoMapper.deserializeDtoToEntity(
        this.schemaValidator,

        {
          ...planDto,
          externalId: plan.id,
          billingProvider: 'stripe'
        },
        em,
        plan
      ),
      em
    );

    return this._mappers.PlanDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      planEntity
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
      ...(await this._mappers.PlanDtoMapper.serializeEntityToDto(
        this.schemaValidator,
        await this.basePlanService.getPlan({ id }, em)
      )),
      stripeFields: plan
    };
  }

  async updatePlan(
    planDto: Dto['UpdatePlanDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PlanDtoMapper']> {
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
      await this._mappers.UpdatePlanDtoMapper.deserializeDtoToEntity(
        this.schemaValidator,

        {
          ...planDto,
          externalId: plan.id,
          billingProvider: 'stripe'
        },
        em,
        plan
      ),
      em
    );

    return this._mappers.PlanDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      planEntity
    );
  }

  async deletePlan(idDto: { id: string }, em?: EntityManager): Promise<void> {
    await this.stripeClient.plans.del(idDto.id);
    await this.basePlanService.deletePlan(idDto, em);
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
    )
      ?.filter((s) => idsDto?.ids?.includes(s.id))
      ?.map((s) => s.id);

    if (!ids) {
      throw new Error('Plans not found');
    }
    return await Promise.all(
      (await this.basePlanService.listPlans({ ids }, em)).map(async (plan) => ({
        ...(await this._mappers.PlanDtoMapper.serializeEntityToDto(
          this.schemaValidator,
          plan
        )),
        stripeFields: plans.data.find(
          (stripePlan) => stripePlan.id === plan.externalId
        )
      }))
    );
  }
}
