import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { InventoryService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  AdjustStockDto,
  CreateInventoryDto,
  StockCheckDto,
  StockCheckResultDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseInventoryDtos } from '../domain/types/baseEcommerceDto.types';
import { BaseInventoryEntities } from '../domain/types/baseEcommerceEntity.types';
import { InventoryMappers } from '../domain/types/inventory.mapper.types';
import { Inventory } from '../persistence/entities';

export class BaseInventoryService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends BaseInventoryEntities,
  MapperDomains extends BaseInventoryDtos = BaseInventoryDtos
> implements InventoryService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: InventoryMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: InventoryMappers<MapperEntities, MapperDomains>,
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

  async createInventory(
    inventoryDto: CreateInventoryDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['InventoryMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating inventory', inventoryDto);
    }
    const inventory = await this.mappers.CreateInventoryMapper.toEntity(
      inventoryDto,
      em ?? this.em,
      ...(args[0] instanceof EntityManager ? args.slice(1) : args)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(inventory);
    });
    return this.mappers.InventoryMapper.toDto(inventory);
  }

  async getInventory(
    variantIdDto: { variantId: string },
    em?: EntityManager
  ): Promise<MapperDomains['InventoryMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting inventory', variantIdDto);
    }
    const inventory = await (em ?? this.em).findOneOrFail(
      this.mappers.InventoryMapper.entity as typeof Inventory,
      { variantId: variantIdDto.variantId }
    );
    return this.mappers.InventoryMapper.toDto(
      inventory as InferEntity<MapperEntities['InventoryMapper']>
    );
  }

  async adjustStock(
    adjustDto: AdjustStockDto,
    em?: EntityManager
  ): Promise<MapperDomains['InventoryMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Adjusting stock', adjustDto);
    }
    const entityManager = em ?? this.em;
    const inventory = await entityManager.findOneOrFail(
      this.mappers.InventoryMapper.entity as typeof Inventory,
      { variantId: adjustDto.variantId }
    );
    const nextStock = inventory.stock + adjustDto.delta;
    // Guard against oversell — stock never goes negative (ECOM-04).
    if (nextStock < 0) {
      throw new Error(
        `Insufficient stock for variant ${adjustDto.variantId}: have ${inventory.stock}, requested change ${adjustDto.delta}`
      );
    }
    entityManager.assign(inventory, { stock: nextStock });
    await entityManager.transactional(async (innerEm) => {
      await innerEm.persist(inventory);
    });
    return this.mappers.InventoryMapper.toDto(
      inventory as InferEntity<MapperEntities['InventoryMapper']>
    );
  }

  async checkStock(
    stockCheckDto: StockCheckDto,
    em?: EntityManager
  ): Promise<StockCheckResultDto> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Checking stock', stockCheckDto);
    }
    const inventory = await (em ?? this.em).findOneOrFail(
      this.mappers.InventoryMapper.entity as typeof Inventory,
      { variantId: stockCheckDto.variantId }
    );
    return {
      variantId: stockCheckDto.variantId,
      available: inventory.stock >= stockCheckDto.requested,
      stock: inventory.stock
    };
  }
}
