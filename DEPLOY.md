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
