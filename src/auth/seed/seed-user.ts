import { datasource } from '@db/data-source';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { DataSource } from 'typeorm';
import { Role } from '../role/role.enum';
import { User } from '../user/user.entity';
import { config } from 'dotenv';

config();
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true,
  logging: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  entities: [User],
});

async function seed() {
  console.log('🌱 Seeding users...');
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const passwordSuperAdmin = await bcrypt.hash(
    process.env.SuperAdmin_PASSWORD,
    10,
  );
  const passwordOperator = await bcrypt.hash(process.env.Operator_PASSWORD, 10);

  const users = [
    {
      id: nanoid(12),
      username: process.env.SuperAdmin_USERNAME,
      password: passwordSuperAdmin,
      role: Role.SuperAdmin,
    },
    {
      id: nanoid(12),
      username: process.env.Operator_USERNAME,
      password: passwordOperator,
      role: Role.Operator,
    },
  ];

  for (const userData of users) {
    const exists = await userRepository.findOneBy({
      username: userData.username,
    });
    if (!exists) {
      await userRepository.save(userData);
    }
  }

  console.log('🌱 Seed complete!');
  process.exit();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
