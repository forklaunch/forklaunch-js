import { Migration } from '@mikro-orm/migrations';

export class Migration20250313215036 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "sample_worker_record" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "message" text not null, "processed" boolean not null, "retry_count" int not null, constraint "sample_worker_record_pkey" primary key ("id"));`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "sample_worker_record" cascade;`);
  }
}
