# การ Deploy และการจัดการ Docker

## โครงสร้างของ Docker

โปรเจกต์นี้แบ่งการทำงานออกเป็น 2 ส่วนหลัก:
1. **Database Container**: ใช้ PostgreSQL 17
2. **Backend Container**: ใช้ NestJS ที่รันด้วย Bun

ทั้งสองส่วนถูกแยกออกจากกันเป็นคนละ container และสื่อสารกันผ่าน Docker network

## การ Deploy ด้วย GitHub Actions

โปรเจกต์นี้ใช้ GitHub Actions ในการ deploy อัตโนมัติไปยัง Google Cloud Engine (GCE) เมื่อมีการ push โค้ดไปยัง branch หลัก:

- **Production**: Deploy เมื่อ push ไปที่ branch `main`
- **UAT**: Deploy เมื่อ push ไปที่ branch `uat`

### Workflow การทำงาน

1. Build Docker image
2. Push ไปยัง Google Artifact Registry
3. Upload ไฟล์ docker-compose และ .env ไปยัง GCE VM
4. รัน Docker Compose บน VM
   - ถ้า database container ยังไม่ทำงาน จะรันทั้ง database และ backend
   - ถ้า database container กำลังทำงานอยู่แล้ว จะอัพเดทเฉพาะ backend container

## การรัน Docker บนเครื่อง Local

### Production

```bash
# สร้าง .env.production จาก template
cp .env.production.example .env.production

# แก้ไขไฟล์ .env.production ให้ถูกต้อง

# รันด้วย Docker Compose
docker-compose up -d
```

### UAT

```bash
# สร้าง .env.uat จาก template
cp .env.uat.example .env.uat

# แก้ไขไฟล์ .env.uat ให้ถูกต้อง

# รันด้วย Docker Compose สำหรับ UAT
docker-compose -f docker-compose.uat.yml up -d
```

## การจัดการ Docker Containers

### ดู Logs

```bash
# Production
docker-compose logs -f

# UAT
docker-compose -f docker-compose.uat.yml logs -f
```

### หยุดการทำงาน

```bash
# Production
docker-compose down

# UAT
docker-compose -f docker-compose.uat.yml down
```

### ล้าง Images เก่า

```bash
docker image prune -af --filter "until=24h"
```

## Database schema บน Production

บน production `synchronize` จะ **ปิด** (มาจาก `NODE_ENV=production` หรือ
`DB_SYNCHRONIZE=false` ใน `db/data-source.ts`) เพื่อกัน TypeORM ไป alter/drop
schema อัตโนมัติ ดังนั้นการเปลี่ยน entity (คอลัมน์/อินเด็กซ์ใหม่) **จะไม่ถูก apply
ให้เอง** ต้องทำเองหลัง deploy:

```bash
# ตัวเลือกที่ปลอดภัยสุด: ดู SQL ที่ต้องรันก่อน (ไม่แก้ DB)
# (รันในเครื่องที่ต่อ prod DB ได้)
bunx typeorm schema:log -d db/data-source.ts

# หรือ apply อินเด็กซ์/คอลัมน์ใหม่แบบครั้งเดียว (ตรวจ SQL ข้างบนก่อนเสมอ)
DB_SYNCHRONIZE=true NODE_ENV=production node dist/...   # ใช้เฉพาะ maintenance window แล้วปิดกลับ
```

> อินเด็กซ์ที่เพิ่มในรอบ refactor (`@Index` บน FK/filter/sort columns) จะถูกสร้าง
> อัตโนมัติบน dev (synchronize เปิด) แต่บน prod ต้อง apply เองด้วยวิธีข้างบน

### Fuzzy search (`pg_trgm`)

dropdown ค้นหาสินค้าใช้ trigram similarity เมื่อมี extension `pg_trgm`
(ถ้าไม่มีจะ fallback เป็นการค้นแบบ substring — ไม่ error)

**`pg_trgm` ถูกติดตั้งให้อัตโนมัติอยู่แล้ว** ผ่าน [Dockerfile.db](Dockerfile.db)
(`postgres:17` + `postgresql-contrib`) และ
[db/init-scripts/00-init-extensions.sh](db/init-scripts/00-init-extensions.sh)
(`CREATE EXTENSION IF NOT EXISTS pg_trgm`) — สคริปต์รันตอน DB container init volume
เปล่าครั้งแรก ดังนั้น **deploy บน volume ใหม่ได้ extension มาเลย ไม่ต้องทำอะไร**

ตรวจ prod ปัจจุบัน (เฉพาะกรณี volume ถูก init ก่อนจะมี init-script):

```bash
docker exec db-production psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT extname FROM pg_extension WHERE extname='pg_trgm';"
# ถ้าผลว่าง ค่อยติดตั้งครั้งเดียว:
docker exec db-production psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

GIN trigram index (perf เท่านั้น — fuzzy ทำงานได้แม้ไม่มี) ไม่ได้อยู่ใน init-script
เพราะตาราง `product` ยังไม่ถูกสร้างตอน DB init; เพิ่มบน prod เมื่อ catalogue ใหญ่ขึ้น:

```bash
docker exec db-production psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON product USING gin (name gin_trgm_ops);"
```

> dev: แอป provision extension + index ให้อัตโนมัติตอน start (เผื่อ local dev ไม่ได้ใช้ image นี้)
