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
    const session = new Session();
    session.customerEmail = this.dto.customerEmail;
    session.paymentMethods = this.dto.paymentMethods;
    session.successRedirectUri = this.dto.successRedirectUri;
    session.cancelRedirectUri = this.dto.cancelRedirectUri;
    if (this.dto.extraFields) {
      session.extraFields = this.dto.extraFields;
    }
    return session;
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
    const session = new Session();
    if (this.dto.customerEmail) {
      session.customerEmail = this.dto.customerEmail;
    }
    if (this.dto.paymentMethods) {
      session.paymentMethods = this.dto.paymentMethods;
    }
    if (this.dto.successRedirectUri) {
      session.successRedirectUri = this.dto.successRedirectUri;
    }
    if (this.dto.cancelRedirectUri) {
      session.cancelRedirectUri = this.dto.cancelRedirectUri;
    }
    if (this.dto.extraFields) {
      session.extraFields = this.dto.extraFields;
    }
    return session;
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
    this.dto = {
      id: session.id,
      customerEmail: session.customerEmail,
      paymentMethods: session.paymentMethods,
      successRedirectUri: session.successRedirectUri,
      cancelRedirectUri: session.cancelRedirectUri,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
    if (session.extraFields) {
      this.dto.extraFields = session.extraFields;
    }
    return this;
  }
}
