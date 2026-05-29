# การ Deploy และการจัดการ Docker ที่ถูกปรับปรุงใหม่

## โครงสร้างของ Docker

โปรเจกต์นี้แบ่งการทำงานออกเป็น 2 ส่วนหลัก โดยทั้งคู่มี Custom Docker Images ที่ถูก Push เข้า Registry:

1. **Database Container**: Custom PostgreSQL 17 image พร้อมการตั้งค่าเพิ่มเติม
   - สร้างจาก Dockerfile.db
   - มีการเพิ่ม extensions และ optimizations
   - Push เข้า Registry เป็น `db:latest` และ `db:[SHA]`

2. **Backend Container**: NestJS ที่รันด้วย Bun
   - สร้างจาก Dockerfile หลัก
   - Push เข้า Registry เป็น `backend:latest` และ `backend:[SHA]`

ทั้งสองส่วนถูกแยกออกจากกันอย่างชัดเจน และสื่อสารกันผ่าน Docker network

## สภาพแวดล้อมการทำงาน

โปรเจกต์นี้รองรับ 2 สภาพแวดล้อม:

1. **Production**: ใช้ port 5432 สำหรับ DB และ port 3000 สำหรับ Backend
2. **UAT (User Acceptance Testing)**: ใช้ port 5433 สำหรับ DB และ port 3001 สำหรับ Backend

## การ Deploy ด้วย GitHub Actions

โปรเจกต์นี้ใช้ GitHub Actions ในการ deploy อัตโนมัติไปยัง Google Cloud Engine (GCE) เมื่อมีการ push โค้ดไปยัง branch หลัก:

- **Production**: Deploy เมื่อ push ไปที่ branch `main`
- **UAT**: Deploy เมื่อ push ไปที่ branch `uat`

### Workflow การทำงาน

1. Build Docker images (ทั้ง backend และ db)
2. Push images ไปยัง Google Artifact Registry
3. Upload ไฟล์ docker-compose และ .env ไปยัง GCE VM
4. Pull images บน VM และรัน Docker Compose

## การรัน Docker บนเครื่อง Local

### Production

```bash
# สร้าง .env.production จาก template
cp .env.production.example .env.production

# แก้ไขไฟล์ .env.production ให้ถูกต้อง

# Build images
docker build -t erp-backend:latest .
docker build -t erp-db:latest -f Dockerfile.db .

# รันด้วย Docker Compose
BACKEND_IMAGE_TAG=erp-backend:latest DB_IMAGE_TAG=erp-db:latest docker-compose up -d
```

### UAT

```bash
# สร้าง .env.uat จาก template
cp .env.uat.example .env.uat

# แก้ไขไฟล์ .env.uat ให้ถูกต้อง

# Build images
docker build -t erp-backend-uat:latest .
docker build -t erp-db-uat:latest -f Dockerfile.db .

# รันด้วย Docker Compose สำหรับ UAT
BACKEND_IMAGE_TAG=erp-backend-uat:latest DB_IMAGE_TAG=erp-db-uat:latest docker-compose -f docker-compose.uat.yml up -d
```

## การใช้งาน DB Image แยกต่างหาก

หากต้องการใช้งานเฉพาะ DB Image สามารถทำได้ดังนี้:

```bash
# Pull DB image จาก Registry (ถ้าต้องการ)
docker pull asia-southeast1-docker.pkg.dev/[PROJECT_ID]/slj-repo/db:latest

# รันเฉพาะ DB
docker run -d --name my-db \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  --env-file .env.production \
  asia-southeast1-docker.pkg.dev/[PROJECT_ID]/slj-repo/db:latest
```

# การใช้งาน Docker Compose พร้อม Environment Variables

## วิธีที่ 1: ใช้ .env file (แนะนำ)

การใช้ .env file เป็นวิธีที่ดีที่สุดเพราะ:
- ไม่ต้องเปิดเผย Project ID และข้อมูลสำคัญในไฟล์ docker-compose
- สามารถใช้ไฟล์เดียวกันในหลาย environments
- ง่ายต่อการจัดการ secrets

```bash
# สร้าง .env.docker จาก template
cp .env.docker.example .env.docker

# แก้ไข GCP_PROJECT และค่าอื่นๆให้ถูกต้อง
nano .env.docker

# รัน docker-compose โดยระบุ env file
docker-compose --env-file .env.docker up -d
```

## วิธีที่ 2: ระบุค่า Environment Variables ตรงๆ

```bash
# รัน docker-compose พร้อมระบุ environment variables
GCP_PROJECT=your-gcp-project \
BACKEND_IMAGE_TAG=asia-southeast1-docker.pkg.dev/your-gcp-project/slj-repo/backend:latest \
DB_IMAGE_TAG=asia-southeast1-docker.pkg.dev/your-gcp-project/slj-repo/db:latest \
docker-compose up -d
```

## วิธีที่ 3: แก้ไขไฟล์ docker-compose.yml โดยตรง

คุณสามารถแก้ไข Project ID โดยตรงในไฟล์ docker-compose.yml แต่ต้องระวังไม่ให้ commit ข้อมูลสำคัญเข้า Git:

```dockercompose
services:
  db:
    image: ${DB_IMAGE_TAG:-asia-southeast1-docker.pkg.dev/actual-project-id/slj-repo/db:latest}
```

## การเรียกใช้เฉพาะ Database

หากต้องการรันเฉพาะ database:

```bash
# รันเฉพาะ database container
docker-compose -f docker-compose.db.yml up -d
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
