import { Migration } from '@mikro-orm/migrations';

export class Migration20260716224615 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "review" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "product_id" text not null, "order_id" text null, "rating" int not null, "title" text null, "body" text not null, "media" jsonb null, "status" text not null, primary key ("id"));`);

    this.addSql(`alter table "review" add constraint "review_status_check" check ("status" in ('pending', 'published', 'rejected'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`);
  }

}
