# 1. ใช้ Bun เป็น base image (มี Node + Bun ติดมาแล้ว)
FROM oven/bun:1.2.14 AS builder

# 2. ตั้ง working directory
WORKDIR /app

# 3. คัดลอกไฟล์โปรเจกต์
COPY . .

# 4. ติดตั้ง dependencies
RUN bun install

# 5. สร้าง build (NestJS ยังใช้ TypeScript)
RUN bun run build

# ===== Image สำหรับ production =====
FROM oven/bun:1.2.14

WORKDIR /app

# คัดลอกไฟล์ที่ build แล้วมาเฉพาะ
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/bun.lock .
COPY entrypoint.sh .

RUN chmod +x entrypoint.sh
RUN apt-get update && apt-get install -y netcat-openbsd

ENV NODE_ENV=production
# เปิดพอร์ตตาม Nest (เช่น 3000)
EXPOSE 3000

# รันแอป
CMD ["./entrypoint.sh"]

