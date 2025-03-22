import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import { SchemaValidator } from '@forklaunch/framework-core';
import { v4 } from 'uuid';
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';
import {
  CreateSessionDto,
  CreateSessionDtoMapper,
  SessionDto,
  SessionDtoMapper
} from '../models/dtoMapper/session.dtoMapper';
import { Session } from '../models/persistence/session.entity';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { Metrics } from '@forklaunch/framework-monitoring';

export class BaseCheckoutSessionService implements CheckoutSessionService {
  constructor(
    private cache: TtlCache,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  private createCacheKey = createCacheKey('checkout_session');

  async createCheckoutSession(
    sessionDto: CreateSessionDto
  ): Promise<SessionDto> {
    const session = CreateSessionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      sessionDto
    );
    session.id = v4();

    // Store the session details in the cache
    await this.cache.putRecord({
      key: this.createCacheKey(session.id),
      value: session,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const cachedSessionDetails = await this.cache.readRecord<Session>(
      this.createCacheKey(session.id)
    );
    const createdSessionDto = SessionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      cachedSessionDetails.value
    );
    return createdSessionDto;
  }

  async getCheckoutSession(id: string): Promise<SessionDto> {
    const sessionDetails = await this.cache.readRecord<Session>(
      this.createCacheKey(id)
    );
    if (!sessionDetails) {
      throw new Error('Session not found');
    }
    return sessionDetails.value;
  }

  async expireCheckoutSession(id: string): Promise<void> {
    const sessionDetails = await this.cache.readRecord(this.createCacheKey(id));
    if (!sessionDetails) {
      throw new Error('Session not found');
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutSuccess(id: string): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutFailure(id: string): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(this.createCacheKey(id));
  }
}
