import {
  BaseDtoParameters,
  IdDto,
  SchemaValidator
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  BaseCheckoutSessionServiceParameters,
  CheckoutSessionService
} from '../interfaces/checkoutSession.service.interface';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
  CreateCheckoutSessionDtoMapper
} from '../models/dtoMapper/checkoutSession.dtoMapper';
import { CheckoutSession } from '../models/persistence/checkoutSession';

export class BaseCheckoutSessionService
  implements
    CheckoutSessionService<
      BaseDtoParameters<typeof BaseCheckoutSessionServiceParameters>
    >
{
  SchemaDefinition = BaseCheckoutSessionServiceParameters;

  constructor(
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  protected createCacheKey = createCacheKey('checkout_session');

  async createCheckoutSession(
    checkoutSessionDto: CreateCheckoutSessionDto
  ): Promise<CheckoutSessionDto> {
    const checkoutSession =
      CreateCheckoutSessionDtoMapper.deserializeDtoToEntity(
        SchemaValidator(),
        checkoutSessionDto
      );

    // Store the checkoutSession details in the cache
    await this.cache.putRecord({
      key: this.createCacheKey(checkoutSession.id),
      value: checkoutSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return checkoutSession;
  }

  async getCheckoutSession({ id }: IdDto): Promise<CheckoutSessionDto> {
    const checkoutSessionDetails = await this.cache.readRecord<CheckoutSession>(
      this.createCacheKey(id)
    );
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }

    return checkoutSessionDetails.value;
  }

  async expireCheckoutSession({ id }: IdDto): Promise<void> {
    const checkoutSessionDetails = await this.cache.readRecord(
      this.createCacheKey(id)
    );
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutSuccess({ id }: IdDto): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutFailure({ id }: IdDto): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(this.createCacheKey(id));
  }
}

// class StripeSession extends CheckoutSession {
//   payment2Methods!: PaymentMethodEnum[];
// }

// type StripeCreateSessionByInheritanceDto =
//   StripeCreateSessionByInheritanceDtoMapper['dto'];
// class StripeCreateSessionByInheritanceDtoMapper extends CreateCheckoutSessionDtoMapper {
//   schema = {
//     ...CreateCheckoutSessionDtoMapper.schema(),
//     payment2Methods: array(enum_(PaymentMethodEnum))
//   };

//   toEntity(): StripeSession {
//     return StripeSession.create(this.dto);
//   }
// }

// type StripeCreateCheckoutSessionDto =
//   StripeCreateCheckoutSessionDtoMapper['dto'];
// export class StripeCreateCheckoutSessionDtoMapper extends RequestDtoMapper<
//   StripeSession,
//   SchemaValidator
// > {
//   schema = {
//     ...CreateCheckoutSessionDtoMapper.schema(),
//     payment2Methods: array(enum_(PaymentMethodEnum))
//   };

//   toEntity(): StripeSession {
//     return StripeSession.create(this.dto);
//   }
// }

// export class StripeCheckoutSessionService extends BaseCheckoutSessionService {
//   constructor(
//     cache: TtlCache,
//     openTelemetryCollector: OpenTelemetryCollector<Metrics>
//   ) {
//     super(cache, openTelemetryCollector);
//   }

//   async createCheckoutSession(
//     checkoutSessionDto: StripeCreateCheckoutSessionDto
//   ): Promise<CheckoutSessionDto> {
//     const checkoutSession = await super.createCheckoutSession(sessionDto);
//     checkoutSessionDto.payment2Methods.concat([]);
//     // const stripeSession = await this.stripe.createCheckoutSession(session);
//     return checkoutSession;
//   }

//   async handleCheckoutFailure({
//     id,
//     message
//   }: {
//     id: string;
//     message: string;
//   }): Promise<void> {
//     const checkoutSession = await super.getCheckoutSession(id);
//     // const stripeSession = await this.stripe.getCheckoutSession(id);
//     // return checkoutSession;
//   }
// }

// const m = {
//   CreateCheckoutSessionDto: StripeCreateCheckoutSessionDtoMapper.schema(),
//   Id: {
//     id: string
//   },
//   CheckoutSessionDto: CheckoutSessionDtoMapper.schema()
// };

// export class StripeSessionServiceByComposisition
//   implements CheckoutSessionService<Schema<typeof m, SchemaValidator>>
// {
//   constructor(
//     private readonly baseCheckoutSessionService: BaseCheckoutSessionService
//   ) {}
//   async createCheckoutSession(
//     checkoutSessionDto: StripeCreateCheckoutSessionDto
//   ): Promise<CheckoutSessionDto> {
//     return this.baseCheckoutSessionService.createCheckoutSession(sessionDto);
//   }
//   getCheckoutSession = async ({
//     id
//   }: {
//     id: string;
//   }): Promise<CheckoutSessionDto> => {
//     return this.baseCheckoutSessionService.getCheckoutSession({ id });
//   };
//   expireCheckoutSession = async ({ id }: { id: string }): Promise<void> => {
//     return this.baseCheckoutSessionService.expireCheckoutSession({ id });
//   };
//   handleCheckoutSuccess = async ({ id }: { id: string }): Promise<void> => {
//     return this.baseCheckoutSessionService.handleCheckoutSuccess({ id });
//   };
//   handleCheckoutFailure = async ({ id }: { id: string }): Promise<void> => {
//     return this.baseCheckoutSessionService.handleCheckoutFailure({ id });
//   };

//   // async createCheckoutSession(
//   //   checkoutSessionDto: StripeCreateSessionByInheritanceDto
//   // ): Promise<CheckoutSessionDto> {
//   //   return this.stripeSessionService.createCheckoutSession(sessionDto);
//   // }
// }

// export const dtoMappers = {
//   createCheckoutCheckoutSessionDtoMapper:
//     StripeCreateCheckoutSessionDtoMapper.schema()
// };
