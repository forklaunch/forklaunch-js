import { Configuration, IDatabaseDriver } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { MongoDriver } from '@mikro-orm/mongodb';
import { MySqlDriver } from '@mikro-orm/mysql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SqliteDriver } from '@mikro-orm/sqlite';

const parseDbType = <Db extends string>(
  dbType?: Db
): {
  new (config: Configuration): IDatabaseDriver;
} => {
  switch (dbType) {
    case 'mongo':
      return MongoDriver;
    case 'postgres':
      return PostgreSqlDriver;
    case 'sqlite':
      return SqliteDriver;
    case 'mysql':
      return MySqlDriver;
    default:
      return PostgreSqlDriver;
  }
};

const mikroOrmOptionsConfig = {
  driver: parseDbType(process.env.FORKLIFT_DB_TYPE),
  dbName:
    process.env.FORKLIFT_DB_NAME || '{{ app_name }}-{{ service_name }}-dev',
  host: process.env.FORKLIFT_DB_HOST || 'localhost',
  user: process.env.FORKLIFT_DB_USER || 'postgres',
  password: process.env.FORKLIFT_DB_PASSWORD || 'postgres',
  port: 5432,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['models/persistence/**/*.entity.ts'],
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
  extensions: [Migrator]
};

export default mikroOrmOptionsConfig;
