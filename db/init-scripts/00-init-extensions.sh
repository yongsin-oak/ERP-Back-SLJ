#!/bin/bash
set -e

# Script นี้จะทำงานตอน initialize PostgreSQL container ครั้งแรก

echo "Creating extensions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOSQL

echo "Database initialized successfully!"
