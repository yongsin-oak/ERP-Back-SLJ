#!/bin/sh

echo "⏳ Waiting for PostgreSQL..."

if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_PORT" ]; then
  echo "❌ ERROR: POSTGRES_HOST หรือ POSTGRES_PORT ยังไม่ถูกตั้งค่า"
  echo "Current values:"
  echo "  POSTGRES_HOST=$POSTGRES_HOST"
  echo "  POSTGRES_PORT=$POSTGRES_PORT"
  exit 1
fi

# รอจนกว่าจะต่อ PostgreSQL ได้
until nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  echo "Waiting for database at $POSTGRES_HOST:$POSTGRES_PORT..."
  sleep 2
done

echo "✅ Database is up"

echo "🌱 Running seed script..."
bun run seed:prod

echo "🚀 Starting app"
bun run start:prod
