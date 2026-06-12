declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    BYPASS_AUTH?: string;

    // Logging
    LOG_LEVEL?: string;

    // Database
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_DB?: string;
    // Override TypeORM schema auto-sync per environment (default: on in dev, off in prod)
    DB_SYNCHRONIZE?: 'true' | 'false';

    // CORS
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
