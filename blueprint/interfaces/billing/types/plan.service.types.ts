import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreatePlanDto<PlanCadenceEnum, BillingProviderEnum> = {
  active: boolean;
  name: string;
  description?: string;
  price: number;
  cadence: PlanCadenceEnum[keyof PlanCadenceEnum];
  features?: string[];
  extraFields?: unknown;
  externalId: string;
  billingProvider?: BillingProviderEnum[keyof BillingProviderEnum];
};
export type UpdatePlanDto<PlanCadenceEnum, BillingProviderEnum> = IdDto &
  Partial<CreatePlanDto<PlanCadenceEnum, BillingProviderEnum>>;
export type PlanDto<PlanCadenceEnum, BillingProviderEnum> = IdDto &
  CreatePlanDto<PlanCadenceEnum, BillingProviderEnum> &
  Partial<RecordTimingDto>;

export type PlanServiceParameters<PlanCadenceEnum, BillingProviderEnum> = {
  CreatePlanDto: CreatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
  UpdatePlanDto: UpdatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
  PlanDto: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
