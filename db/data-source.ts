import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';

// Load the environment-specific file first (.env.development / .env.production —
// NODE_ENV defaults to development for local runs), then .env as a fallback.
// dotenv keeps the first value it sees, so the environment-specific file wins.
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
config();

// Auto-sync schema in dev/test only — never on production (it can drop/alter columns).
// Default derives from NODE_ENV; set DB_SYNCHRONIZE=true|false to override per environment.
const synchronize =
  process.env.DB_SYNCHRONIZE !== undefined
    ? process.env.DB_SYNCHRONIZE === 'true'
    : process.env.NODE_ENV !== 'production';

const databaseUrl = process.env.DATABASE_URL;

// Managed/remote Postgres (e.g. Supabase) requires SSL; a local/containerized DB
// does not. Default: on when connecting to a non-local host, off otherwise —
// override explicitly with DB_SSL=true|false.
const useSsl =
  process.env.DB_SSL !== undefined
    ? process.env.DB_SSL === 'true'
    : !!databaseUrl && !/@(localhost|127\.0\.0\.1|db)[:/]/.test(databaseUrl);

// Prefer a single DATABASE_URL connection string; fall back to discrete
// POSTGRES_* vars so the self-hosted Docker/prod setup keeps working unchanged.
const connection: DataSourceOptions = databaseUrl
  ? { type: 'postgres', url: databaseUrl }
  : {
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    };

export const datasource: DataSourceOptions = {
  ...connection,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  synchronize,
  logging: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  extra: {
    // node-postgres defaults to 10 connections while postgresql.conf allows 100 —
    // too few slots for the report/export endpoints to share with normal traffic.
    max: Number(process.env.DB_POOL_MAX ?? 20),
    // Without this a single runaway query pins a pooled connection forever and
    // starves every other request.
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30_000),
    idleTimeoutMillis: 30_000,
  },
  // Surfaces slow queries in the app log; postgresql.conf only logs them DB-side.
  maxQueryExecutionTime: 1000,
};
