#!/bin/sh

echo "⏳ Waiting for PostgreSQL..."

# รอ DB ด้วย retry loop (ใช้ bash กับ nc)
until nc -z "$DB_HOST" "$DB_PORT"; do
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  sleep 2
done

echo "✅ Database is up"

echo "🌱 Running seed script..."
bun run seed:prod

echo "🚀 Starting app"
bun run start:prod
