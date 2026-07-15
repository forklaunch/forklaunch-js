import { Migration } from '@mikro-orm/migrations';

export class Migration20260714152213 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "order_event_record" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "order_id" text not null, "from_status" text not null, "to_status" text not null, "items" jsonb not null, "processed" boolean not null, "retry_count" int not null, primary key ("id"));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "order_event_record" cascade;`);
  }

}
