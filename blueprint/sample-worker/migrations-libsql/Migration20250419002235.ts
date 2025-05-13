import { Migration } from '@mikro-orm/migrations';

export class Migration20250419002235 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`sample_worker_event\` (\`id\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`message\` text not null, \`processed\` integer not null, \`retry_count\` integer not null, primary key (\`id\`));`
    );
  }
}
