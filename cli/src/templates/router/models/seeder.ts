import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { {{pascal_case_name}}RecordSeeder } from "./persistence/{{camel_case_name}}Record.entity";
import * as seeders from './seeders';
import { validConfigInjector } from "../mikro-orm.config";

export class DatabaseSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    if (validConfigInjector.resolve('ENV') === 'development') {
      return this.call(em, Object.values(seeders));
    }
    return Promise.resolve();
  }
}
