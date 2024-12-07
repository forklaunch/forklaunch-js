import { Migrator } from '@mikro-orm/migrations';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { {{db_driver}} } from '@mikro-orm/{{database}}';

const mikroOrmOptionsConfig = {
  driver: {{db_driver}},
  dbName: process.env.FORKLAUNCH_DB_NAME || '{{app_name}}-{{service_name}}-dev',
  host: process.env.FORKLAUNCH_DB_HOST || 'localhost',
  user: process.env.FORKLAUNCH_DB_USER || 'postgres',
  password: process.env.FORKLAUNCH_DB_PASSWORD || 'postgres',
  port: 5432,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['models/persistence/**/*.entity.ts'],
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
  extensions: [Migrator]
};

export default mikroOrmOptionsConfig;
