import { Entity, EntityManager, Property } from '@mikro-orm/core';
import { BaseEntity } from '@{{app_name}}/core';
import { Seeder } from '@mikro-orm/seeder';

// Entity class that defines the structure of the {{pascal_case_name}}Record table
@Entity()
export class {{pascal_case_name}}Record extends BaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;{{#is_worker}}

  @Property()
  processed!: boolean;

  @Property()
  retryCount!: number;{{/is_worker}}
}

export class {{pascal_case_name}}RecordSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create({{pascal_case_name}}Record, {
      message: 'Hello, world!',{{#is_worker}}
      processed: false,
      retryCount: 0,{{/is_worker}}
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return Promise.resolve();
  }
}
