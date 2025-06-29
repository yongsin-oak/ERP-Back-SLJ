import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';

config();
export const datasource: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT, 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true, // สำหรับ dev เท่านั้น อย่าใช้ใน prod
  logging: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
};
