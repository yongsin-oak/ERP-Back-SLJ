import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { config } from 'dotenv';
import { Role } from '../role/role.enum';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true, // สำหรับ dev เท่านั้น อย่าใช้ใน prod
  logging: false,
  entities: [User],
});

async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const passwordSuperAdmin = await bcrypt.hash(
    process.env.SuperAdmin_PASSWORD,
    10,
  );
  const passwordOperator = await bcrypt.hash(process.env.Operator_PASSWORD, 10);

  const users = [
    {
      username: process.env.SuperAdmin_USERNAME,
      password: passwordSuperAdmin,
      role: Role.SuperAdmin,
    },
    {
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
