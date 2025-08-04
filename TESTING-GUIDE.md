# 🐳 คู่มือการใช้งาน Docker สำหรับ ERP System

## 📁 ไฟล์ที่มีอยู่และหน้าที่

### Docker Compose Files:
1. **`docker-compose.yml`** - Production environment
2. **`docker-compose.uat.yml`** - UAT environment  
3. **`docker-compose.db.yml`** - เฉพาะ Database สำหรับการทดสอบ

### Dockerfile:
1. **`Dockerfile`** - สำหรับ build Backend (NestJS + Bun)
2. **`Dockerfile.db`** - สำหรับ build Database (PostgreSQL + custom config)

### Environment Files:
1. **`.env.production.example`** - Template สำหรับ production
2. **`.env.uat.example`** - Template สำหรับ UAT
3. **`.env.local`** - สำหรับการทดสอบบน local

---

## 🚀 วิธีการทดสอบแต่ละแบบ

### 1. ทดสอบเฉพาะ Database บน Local

```bash
# ใช้ไฟล์ .env.local ที่สร้างไว้แล้ว
docker-compose -f docker-compose.db.yml --env-file .env.local up -d

# ตรวจสอบว่า database ทำงาน
docker logs db-local

# เข้าถึง database
docker exec -it db-local psql -U postgres -d erp_local
```

### 2. ทดสอบ Backend + Database บน Local (ใช้ Official Postgres)

```bash
# สร้าง .env.production จาก template
cp .env.production.example .env.production

# แก้ไขให้ใช้ postgres:17 แทน custom image
# ใน .env.production เปลี่ยนเป็น:
# DB_IMAGE_TAG=postgres:17

# รัน backend + database
docker-compose --env-file .env.production up -d

# ดู logs
docker-compose logs -f
```

### 3. ทดสอบ Backend + Database บน Local (ใช้ Custom Images)

```bash
# Build custom images ก่อน
docker build -t erp-backend:local .
docker build -t erp-db:local -f Dockerfile.db .

# รัน backend + database ด้วย custom images
BACKEND_IMAGE_TAG=erp-backend:local DB_IMAGE_TAG=erp-db:local docker-compose up -d

# ดู logs
docker-compose logs -f
```

### 4. ทดสอบ UAT Environment

```bash
# สร้าง .env.uat จาก template
cp .env.uat.example .env.uat

# แก้ไขค่าต่างๆ ใน .env.uat

# รัน UAT environment
docker-compose -f docker-compose.uat.yml --env-file .env.uat up -d

# ดู logs
docker-compose -f docker-compose.uat.yml logs -f
```

---

## 🔧 การแก้ไข .env Files

### สำหรับการทดสอบบน Local:

1. **แก้ไข `.env.production`**:
```bash
# แทนที่ your-actual-gcp-project-id ด้วย project จริง
GCP_PROJECT=my-actual-project-id

# สำหรับการทดสอบ local ใช้ postgres:17 โดยตรง
DB_IMAGE_TAG=postgres:17
BACKEND_IMAGE_TAG=erp-backend:local
```

2. **แก้ไข password และ credentials**:
```bash
POSTGRES_PASSWORD=your_secure_password
SuperAdmin_PASSWORD=your_admin_password
JWT_SECRET=your_32_character_secret_key_here
```

---

## 🧪 ขั้นตอนการทดสอบแนะนำ

### Step 1: ทดสอบ Database อย่างเดียวก่อน
```bash
# ทดสอบว่า database ทำงานได้
docker-compose -f docker-compose.db.yml --env-file .env.local up -d

# ตรวจสอบ
docker ps
docker logs db-local
```

### Step 2: ทดสอบ Backend + Database
```bash
# สร้าง .env.production จาก template
cp .env.production.example .env.production

# แก้ไข .env.production (ใส่ GCP_PROJECT และ passwords)
nano .env.production

# รัน
docker-compose --env-file .env.production up -d

# ตรวจสอบ
docker ps
docker-compose logs -f
```

### Step 3: ทดสอบ Access
```bash
# ทดสอบ backend
curl http://localhost:3000

# ทดสอบ database connection
docker exec -it db-production psql -U [your-user] -d [your-db]
```

---

## 🚨 ปัญหาที่อาจพบและการแก้ไข

### 1. Image ไม่เจอ
```bash
# ตรวจสอบว่า environment variables ถูกต้อง
echo $DB_IMAGE_TAG
echo $BACKEND_IMAGE_TAG

# ถ้าใช้ custom image ต้อง build ก่อน
docker build -t erp-backend:local .
docker build -t erp-db:local -f Dockerfile.db .
```

### 2. Database connection failed
```bash
# ตรวจสอบว่า database container ทำงานอยู่
docker ps | grep db

# ตรวจสอบ logs
docker logs db-production

# ตรวจสอบ network
docker network ls
```

### 3. Port conflicts
```bash
# ตรวจสอบ port ที่ใช้งานอยู่
lsof -i :5432
lsof -i :3000

# ถ้า conflict ให้เปลี่ยน port ใน docker-compose
```

---

## 💡 คำแนะนำ

1. **เริ่มจากทดสอบ database ก่อน**
2. **ใช้ postgres:17 สำหรับการทดสอบเบื้องต้น**
3. **Build custom images เมื่อต้องการทดสอบ production-like environment**
4. **ตรวจสอบ logs เสมอเมื่อมีปัญหา**
5. **ใช้ .env.local สำหรับการทดสอบเพื่อไม่ให้ conflict กับ production**
