import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { {{camel_case_name}}Record } from "../seed.data";
import { {{pascal_case_name}}Record } from "../entities/{{camel_case_name}}Record.entity";

export class {{pascal_case_name}}RecordSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create({{pascal_case_name}}Record, {{camel_case_name}}Record);
    return Promise.resolve();
  }
}
