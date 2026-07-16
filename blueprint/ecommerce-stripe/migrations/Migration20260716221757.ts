import { Migration } from '@mikro-orm/migrations';

export class Migration20260716221757 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "order" add "shipping_address" text not null, add "tax_breakdown" jsonb not null, add "shipping_cents" int not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "order" drop column "shipping_address", drop column "tax_breakdown", drop column "shipping_cents";`);
  }

}
