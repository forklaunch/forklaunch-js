import { Migration } from '@mikro-orm/migrations';

export class Migration20250418110400 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`sample_worker_event\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`message\` text not null, \`processed\` tinyint(1) not null, \`retry_count\` int not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`
    );
  }
}
