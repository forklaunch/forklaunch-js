import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  date,
  enum_,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/framework-core';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { Session } from '../persistence/session.entity';

export type CreateSessionDto = CreateSessionDtoMapper['dto'];
export class CreateSessionDtoMapper extends RequestDtoMapper<
  Session,
  SchemaValidator
> {
  schema = {
    customerEmail: string,
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown)
  };

  toEntity(): Session {
    return Session.create(this.dto);
  }
}

export type UpdateSessionDto = UpdateSessionDtoMapper['dto'];
export class UpdateSessionDtoMapper extends RequestDtoMapper<
  Session,
  SchemaValidator
> {
  schema = {
    id: uuid,
    customerEmail: optional(string),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  };

  toEntity(): Session {
    return Session.update(this.dto);
  }
}

export type SessionDto = SessionDtoMapper['dto'];
export class SessionDtoMapper extends ResponseDtoMapper<
  Session,
  SchemaValidator
> {
  schema = {
    id: uuid,
    customerEmail: string,
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown),
    createdAt: date,
    updatedAt: date
  };

  fromEntity(session: Session): this {
    this.dto = session.read();
    return this;
  }
}
