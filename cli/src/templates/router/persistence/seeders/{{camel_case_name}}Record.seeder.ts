import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { {{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record } from "../seed.data";
import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record } from "../entities/{{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record.entity";

export class {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}RecordSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create({{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record, await {{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record());
    return Promise.resolve();
  }
}
