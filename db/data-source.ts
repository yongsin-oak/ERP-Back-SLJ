import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';

config();
export const datasource: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true, // สำหรับ dev เท่านั้น อย่าใช้ใน prod
  logging: false,
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
};
