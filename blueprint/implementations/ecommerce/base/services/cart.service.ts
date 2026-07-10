import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { CartService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  AddCartItemDto,
  CreateCartDto,
  RemoveCartItemDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseCartDtos } from '../domain/types/baseEcommerceDto.types';
import { BaseCartEntities } from '../domain/types/baseEcommerceEntity.types';
import { CartMappers } from '../domain/types/cart.mapper.types';
import { Cart } from '../persistence/entities';

export class BaseCartService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends BaseCartEntities,
  MapperDomains extends BaseCartDtos = BaseCartDtos
> implements CartService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: CartMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: CartMappers<MapperEntities, MapperDomains>,
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createCart(
    cartDto: CreateCartDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['CartMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating cart', cartDto);
    }
    const cart = await this.mappers.CreateCartMapper.toEntity(
      cartDto,
      em ?? this.em,
      ...(args[0] instanceof EntityManager ? args.slice(1) : args)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(cart);
    });
    return this.mappers.CartMapper.toDto(cart);
  }

  async getCart(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<MapperDomains['CartMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting cart', idDto);
    }
    const cart = await (em ?? this.em).findOneOrFail(
      this.mappers.CartMapper.entity as typeof Cart,
      idDto
    );
    return this.mappers.CartMapper.toDto(
      cart as InferEntity<MapperEntities['CartMapper']>
    );
  }

  /**
   * Out-of-stock items are allowed in the cart — the check happens at
   * checkout, not here (per ECOM-06).
   */
  async addItem(
    addItemDto: AddCartItemDto,
    em?: EntityManager
  ): Promise<MapperDomains['CartMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Adding cart item', addItemDto);
    }
    const entityManager = em ?? this.em;
    const cart = await entityManager.findOneOrFail(
      this.mappers.CartMapper.entity as typeof Cart,
      { id: addItemDto.cartId }
    );
    const items = [...(cart.items ?? [])];
    const existing = items.find((i) => i.variantId === addItemDto.variantId);
    if (existing) {
      existing.quantity += addItemDto.quantity;
    } else {
      items.push({
        variantId: addItemDto.variantId,
        quantity: addItemDto.quantity
      });
    }
    entityManager.assign(cart, { items });
    await entityManager.transactional(async (innerEm) => {
      await innerEm.persist(cart);
    });
    return this.mappers.CartMapper.toDto(
      cart as InferEntity<MapperEntities['CartMapper']>
    );
  }

  async removeItem(
    removeItemDto: RemoveCartItemDto,
    em?: EntityManager
  ): Promise<MapperDomains['CartMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Removing cart item', removeItemDto);
    }
    const entityManager = em ?? this.em;
    const cart = await entityManager.findOneOrFail(
      this.mappers.CartMapper.entity as typeof Cart,
      { id: removeItemDto.cartId }
    );
    const items = (cart.items ?? []).filter(
      (i) => i.variantId !== removeItemDto.variantId
    );
    entityManager.assign(cart, { items });
    await entityManager.transactional(async (innerEm) => {
      await innerEm.persist(cart);
    });
    return this.mappers.CartMapper.toDto(
      cart as InferEntity<MapperEntities['CartMapper']>
    );
  }

  async clearCart(idDto: { id: string }, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Clearing cart', idDto);
    }
    const entityManager = em ?? this.em;
    const cart = await entityManager.findOneOrFail(
      this.mappers.CartMapper.entity as typeof Cart,
      idDto
    );
    entityManager.assign(cart, { items: [] });
    await entityManager.transactional(async (innerEm) => {
      await innerEm.persist(cart);
    });
  }
}
