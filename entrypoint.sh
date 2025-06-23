#!/bin/sh

echo "⏳ Waiting for PostgreSQL..."

# ตรวจสอบว่า DB_HOST และ DB_PORT ถูกตั้งค่าหรือยัง
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "❌ ERROR: DB_HOST หรือ DB_PORT ยังไม่ถูกตั้งค่า"
  echo "Current values:"
  echo "  DB_HOST=$DB_HOST"
  echo "  DB_PORT=$DB_PORT"
  exit 1
fi

# รอจนกว่าจะต่อ PostgreSQL ได้
until nc -z "$DB_HOST" "$DB_PORT"; do
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  sleep 2
done

echo "✅ Database is up"

echo "🌱 Running seed script..."
bun run seed:prod

echo "🚀 Starting app"
bun run start:prod
