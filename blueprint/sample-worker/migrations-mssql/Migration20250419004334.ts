import { Migration } from '@mikro-orm/migrations';

export class Migration20250419004334 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE [sample_worker_event] ([id] uniqueidentifier not null, [created_at] datetime2 not null, [updated_at] datetime2 not null, [message] text not null, [processed] bit not null, [retry_count] int not null, CONSTRAINT [sample_worker_event_pkey] PRIMARY KEY ([id]));`
    );
  }
}
