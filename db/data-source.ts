import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';

config();

// Auto-sync schema in dev/test only — never on production (it can drop/alter columns).
// Default derives from NODE_ENV; set DB_SYNCHRONIZE=true|false to override per environment.
const synchronize =
  process.env.DB_SYNCHRONIZE !== undefined
    ? process.env.DB_SYNCHRONIZE === 'true'
    : process.env.NODE_ENV !== 'production';

export const datasource: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT, 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize,
  logging: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
};
