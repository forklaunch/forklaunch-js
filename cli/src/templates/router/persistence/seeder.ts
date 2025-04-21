import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}RecordSeeder } from "./seeders/{{camel_case_name}}Record.seeder";
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
