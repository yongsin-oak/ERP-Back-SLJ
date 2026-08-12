declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    BYPASS_AUTH?: string;

    // Logging
    LOG_LEVEL?: string;

    // Database — DATABASE_URL takes precedence; POSTGRES_* is the fallback.
    DATABASE_URL?: string;
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_DB?: string;
    // Force SSL on/off for the DB connection (default: on for a non-local host)
    DB_SSL?: 'true' | 'false';
    // Override TypeORM schema auto-sync per environment (default: on in dev, off in prod)
    DB_SYNCHRONIZE?: 'true' | 'false';
    // Connection pool size (default 20) and per-statement timeout in ms (default 30000)
    DB_POOL_MAX?: string;
    DB_STATEMENT_TIMEOUT_MS?: string;

    // Seed — SuperAdmin bootstrap. No default exists; the seed aborts without
    // these when the database has no SuperAdmin yet.
    SEED_SUPERADMIN_USERNAME?: string;
    SEED_SUPERADMIN_PASSWORD?: string;

    // CORS — MAIN_SITE_URL is preferred; CORS_ORIGIN is the legacy name.
    MAIN_SITE_URL?: string;
    CORS_ORIGIN?: string;

    // JWT
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_REFRESH_EXPIRES_IN?: string;
    ACTOR_TOKEN_EXPIRES_IN?: string;
    TERMINAL_TOKEN_EXPIRES_IN?: string;
  }
}
