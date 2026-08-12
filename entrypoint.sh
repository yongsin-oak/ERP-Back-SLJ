#!/bin/sh
# Abort the whole startup on any failing step. Without this a failed seed — the
# step that refuses to boot an instance with no way to log in — would be printed
# and then ignored, and the app would start anyway.
set -e

# DATABASE_URL carries its own host/port, so the POSTGRES_* readiness probe only
# applies to the discrete-vars (self-hosted Docker) setup.
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Using DATABASE_URL — skipping POSTGRES_* readiness probe"
else
  echo "⏳ Waiting for PostgreSQL..."

  if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_PORT" ]; then
    echo "❌ ERROR: ต้องตั้งค่า DATABASE_URL หรือ POSTGRES_HOST + POSTGRES_PORT"
    echo "Current values:"
    echo "  POSTGRES_HOST=$POSTGRES_HOST"
    echo "  POSTGRES_PORT=$POSTGRES_PORT"
    exit 1
  fi

  until nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
    echo "Waiting for database at $POSTGRES_HOST:$POSTGRES_PORT..."
    sleep 2
  done

  echo "✅ Database is up"
fi

# Bootstraps the SuperAdmin from SEED_SUPERADMIN_* and exits non-zero if the
# database has no admin and no credentials were supplied. Demo fixtures are
# skipped automatically when NODE_ENV=production.
echo "🌱 Running seed script..."
bun run seed:prod

echo "🚀 Starting app"
bun run start:prod
