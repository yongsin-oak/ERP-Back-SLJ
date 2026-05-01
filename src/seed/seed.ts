import { config } from 'dotenv';
config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { DateTime } from 'luxon';

import { User } from '@app/auth/user/user.entity';
import { Brand } from '@app/modules/brand/entities/brand.entity';
import { Category } from '@app/modules/category/entities/category.entity';
import { Employee } from '@app/modules/employee/entities/employee.entity';
import { Shop } from '@app/modules/shop/entities/shop.entity';
import { Product } from '@app/modules/product/entities/product.entity';
import { Order } from '@app/modules/order/entities/order.entity';
import { OrderDetail } from '@app/modules/order-detail/entities/orderDetail.entity';
import { StockEntry, StockEntryType } from '@app/modules/stock-entry/entities/stock-entry.entity';
import { Role } from '@app/auth/role/role.enum';
import { Platform } from '@app/modules/shop/entities/platform.enum';

const today = DateTime.now().setZone('Asia/Bangkok').toFormat('yyyyMMdd');
const id = (prefix: string) => `${prefix}-${nanoid(10).toUpperCase()}`;
const orderId = () => `ORD-${today}-${nanoid(10).toUpperCase()}`;
const detailId = () => `ORDDETAIL-${today}-${nanoid(8).toUpperCase()}`;
const stkId = () => `STK-${today}-${nanoid(10).toUpperCase()}`;

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true,
  logging: false,
  entities: [User, Brand, Category, Employee, Shop, Product, Order, OrderDetail, StockEntry],
});

async function seed() {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();

  const userRepo     = AppDataSource.getRepository(User);
  const brandRepo    = AppDataSource.getRepository(Brand);
  const catRepo      = AppDataSource.getRepository(Category);
  const empRepo      = AppDataSource.getRepository(Employee);
  const shopRepo     = AppDataSource.getRepository(Shop);
  const productRepo  = AppDataSource.getRepository(Product);
  const orderRepo    = AppDataSource.getRepository(Order);
  const detailRepo   = AppDataSource.getRepository(OrderDetail);
  const stkRepo      = AppDataSource.getRepository(StockEntry);

  // ─── Users ────────────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const users = [
    { id: nanoid(12), username: 'superadmin', password: 'superadmin1234', role: Role.SuperAdmin },
    { id: nanoid(12), username: 'operator',   password: 'operator1234',   role: Role.Operator  },
    { id: nanoid(12), username: 'warehouse',  password: 'warehouse1234',  role: Role.Warehouse },
  ];
  for (const u of users) {
    if (!(await userRepo.findOneBy({ username: u.username }))) {
      await userRepo.save({ ...u, password: await bcrypt.hash(u.password, 10) });
    }
  }

  // ─── Brands ───────────────────────────────────────────────────────────────
  console.log('🏷️  Seeding brands...');
  const brandData = [
    { id: id('BRD'), name: 'Coca-Cola',  description: 'เครื่องดื่มน้ำอัดลม' },
    { id: id('BRD'), name: 'Pepsi',      description: 'เครื่องดื่มน้ำอัดลม Pepsi' },
    { id: id('BRD'), name: 'Nestlé',     description: 'ผลิตภัณฑ์อาหารและเครื่องดื่ม' },
    { id: id('BRD'), name: 'Lay\'s',     description: 'มันฝรั่งทอดกรอบ' },
    { id: id('BRD'), name: 'Sprite',     description: 'น้ำอัดลมรสมะนาว' },
    { id: id('BRD'), name: 'Fanta',      description: 'น้ำอัดลมรสผลไม้' },
    { id: id('BRD'), name: 'Singha',     description: 'เครื่องดื่มสิงห์' },
    { id: id('BRD'), name: 'Chang',      description: 'เครื่องดื่มช้าง' },
    { id: id('BRD'), name: 'Oishi',      description: 'ชาเขียวพร้อมดื่ม' },
    { id: id('BRD'), name: 'Mama',       description: 'บะหมี่กึ่งสำเร็จรูปมาม่า' },
    { id: id('BRD'), name: 'Yum Yum',    description: 'บะหมี่กึ่งสำเร็จรูปยำยำ' },
    { id: id('BRD'), name: 'Pringles',   description: 'มันฝรั่งทอดในกระป๋อง' },
    { id: id('BRD'), name: 'Pocky',      description: 'แท่งบิสกิตเคลือบช็อกโกแลต' },
    { id: id('BRD'), name: 'Dutch Mill', description: 'ผลิตภัณฑ์นมดัชมิลล์' },
    { id: id('BRD'), name: 'Foremost',   description: 'ผลิตภัณฑ์นมโฟร์โมสต์' },
    { id: id('BRD'), name: 'Knorr',      description: 'ผงปรุงรสและซุป' },
    { id: id('BRD'), name: 'Tipco',      description: 'น้ำผลไม้ทิปโก้' },
    { id: id('BRD'), name: 'Mali',       description: 'น้ำผลไม้มาลี' },
    { id: id('BRD'), name: 'Bento',      description: 'ปลาหมึกและขนมขบเคี้ยว' },
    { id: id('BRD'), name: 'Lipton',     description: 'ชาลิปตัน' },
  ];
  const brands: Record<string, Brand> = {};
  for (const b of brandData) {
    let brand = await brandRepo.findOneBy({ name: b.name });
    if (!brand) brand = await brandRepo.save(brandRepo.create(b));
    brands[b.name] = brand;
  }

  // ─── Categories ───────────────────────────────────────────────────────────
  console.log('📂 Seeding categories...');
  let catDrink = await catRepo.findOneBy({ name: 'เครื่องดื่ม' });
  if (!catDrink) catDrink = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'เครื่องดื่ม', description: 'สินค้าประเภทเครื่องดื่มทุกชนิด' }));

  let catSnack = await catRepo.findOneBy({ name: 'ขนมขบเคี้ยว' });
  if (!catSnack) catSnack = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'ขนมขบเคี้ยว', description: 'ขนมและของกินเล่น' }));

  let catSoda = await catRepo.findOneBy({ name: 'น้ำอัดลม' });
  if (!catSoda) catSoda = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'น้ำอัดลม', description: 'น้ำอัดลมทุกยี่ห้อ', parent: catDrink }));

  let catJuice = await catRepo.findOneBy({ name: 'น้ำผลไม้' });
  if (!catJuice) catJuice = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'น้ำผลไม้', description: 'น้ำผลไม้คั้นสด', parent: catDrink }));

  let catTea = await catRepo.findOneBy({ name: 'ชา/กาแฟ' });
  if (!catTea) catTea = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'ชา/กาแฟ', description: 'ชาและกาแฟพร้อมดื่ม', parent: catDrink }));

  let catWater = await catRepo.findOneBy({ name: 'น้ำดื่ม' });
  if (!catWater) catWater = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'น้ำดื่ม', description: 'น้ำเปล่าและน้ำแร่', parent: catDrink }));

  let catFood = await catRepo.findOneBy({ name: 'อาหาร' });
  if (!catFood) catFood = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'อาหาร', description: 'อาหารสำเร็จรูปและวัตถุดิบ' }));

  let catNoodle = await catRepo.findOneBy({ name: 'บะหมี่กึ่งสำเร็จรูป' });
  if (!catNoodle) catNoodle = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'บะหมี่กึ่งสำเร็จรูป', description: 'บะหมี่ซองและถ้วย', parent: catFood }));

  let catSeasoning = await catRepo.findOneBy({ name: 'เครื่องปรุง' });
  if (!catSeasoning) catSeasoning = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'เครื่องปรุง', description: 'ผงปรุงรส ซอส น้ำมัน', parent: catFood }));

  let catDairy = await catRepo.findOneBy({ name: 'นมและผลิตภัณฑ์จากนม' });
  if (!catDairy) catDairy = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'นมและผลิตภัณฑ์จากนม', description: 'นม โยเกิร์ต ครีม' }));

  let catCookie = await catRepo.findOneBy({ name: 'บิสกิต/คุกกี้' });
  if (!catCookie) catCookie = await catRepo.save(catRepo.create({ id: id('CAT'), name: 'บิสกิต/คุกกี้', description: 'บิสกิตและคุกกี้', parent: catSnack }));

  // ─── Employees ────────────────────────────────────────────────────────────
  console.log('👷 Seeding employees...');
  const empData = [
    { id: id('EMP'), firstName: 'สมชาย',  lastName: 'ใจดี',     nickname: 'ชาย',   department: Role.Warehouse, phoneNumber: '081-111-1111', startDate: new Date('2022-01-10') },
    { id: id('EMP'), firstName: 'สมหญิง', lastName: 'รักสงบ',   nickname: 'หญิง',  department: Role.Sales,     phoneNumber: '082-222-2222', startDate: new Date('2023-03-15') },
    { id: id('EMP'), firstName: 'วิชัย',  lastName: 'มั่นใจ',   nickname: 'ชัย',   department: Role.Operator,  phoneNumber: '083-333-3333', startDate: new Date('2021-06-01') },
  ];
  const employees: Employee[] = [];
  for (const e of empData) {
    let emp = await empRepo.findOneBy({ firstName: e.firstName, lastName: e.lastName });
    if (!emp) emp = await empRepo.save(empRepo.create(e));
    employees.push(emp);
  }

  // ─── Shops ────────────────────────────────────────────────────────────────
  console.log('🏪 Seeding shops...');
  const shopData = [
    { id: id('SHOP'), name: 'SLJ Official',  platform: Platform.Shopee, description: 'ร้านหลักบน Shopee'  },
    { id: id('SHOP'), name: 'SLJ Store',     platform: Platform.Lazada, description: 'ร้านหลักบน Lazada'  },
    { id: id('SHOP'), name: 'SLJ TikTok',    platform: Platform.TikTok, description: 'ร้านหลักบน TikTok'  },
  ];
  const shops: Shop[] = [];
  for (const s of shopData) {
    let shop = await shopRepo.findOneBy({ name: s.name, platform: s.platform });
    if (!shop) shop = await shopRepo.save(shopRepo.create(s));
    shops.push(shop);
  }

  // ─── Products ─────────────────────────────────────────────────────────────
  console.log('📦 Seeding products...');
  const productData = [
    {
      barcode: '8850999000001',
      name: 'Coca-Cola Can 325ml',
      brand: brands['Coca-Cola'], brandId: brands['Coca-Cola'].id,
      category: catSoda, categoryId: catSoda.id,
      costPrice: { pack: 120, carton: 1320 },
      sellPrice: { pack: 145, carton: 1600 },
      remaining: 500, minStock: 50,
      piecesPerPack: 6, packPerCarton: 4,
      productDimensions: { length: 6.5, width: 6.5, height: 12, weight: 0.35 },
      cartonDimensions: { length: 40, width: 27, height: 25, weight: 9 },
    },
    {
      barcode: '8850999000002',
      name: 'Pepsi Can 325ml',
      brand: brands['Pepsi'], brandId: brands['Pepsi'].id,
      category: catSoda, categoryId: catSoda.id,
      costPrice: { pack: 115, carton: 1260 },
      sellPrice: { pack: 140, carton: 1550 },
      remaining: 300, minStock: 40,
      piecesPerPack: 6, packPerCarton: 4,
      productDimensions: { length: 6.5, width: 6.5, height: 12, weight: 0.35 },
      cartonDimensions: { length: 40, width: 27, height: 25, weight: 9 },
    },
    {
      barcode: '8850999000003',
      name: 'Nestlé Pure Life 600ml',
      brand: brands['Nestlé'], brandId: brands['Nestlé'].id,
      category: catDrink, categoryId: catDrink.id,
      costPrice: { pack: 60, carton: 700 },
      sellPrice: { pack: 80, carton: 900 },
      remaining: 1200, minStock: 100,
      piecesPerPack: 12, packPerCarton: 4,
      productDimensions: { length: 6, width: 6, height: 20, weight: 0.62 },
      cartonDimensions: { length: 50, width: 25, height: 42, weight: 8 },
    },
    {
      barcode: '8850999000004',
      name: "Lay's Classic 75g",
      brand: brands["Lay's"], brandId: brands["Lay's"].id,
      category: catSnack, categoryId: catSnack.id,
      costPrice: { pack: 200, carton: 2200 },
      sellPrice: { pack: 240, carton: 2600 },
      remaining: 4, minStock: 30,
      piecesPerPack: 10, packPerCarton: 3,
    },
    {
      barcode: '8850999000005',
      name: 'Coca-Cola Bottle 1.25L',
      brand: brands['Coca-Cola'], brandId: brands['Coca-Cola'].id,
      category: catSoda, categoryId: catSoda.id,
      costPrice: { pack: 80, carton: 880 },
      sellPrice: { pack: 100, carton: 1080 },
      remaining: 2, minStock: 20,
      piecesPerPack: 6, packPerCarton: 2,
      productDimensions: { length: 10, width: 10, height: 33, weight: 1.35 },
    },
    {
      barcode: '8850999000006',
      name: 'Sprite Can 325ml',
      brand: brands['Sprite'], brandId: brands['Sprite'].id,
      category: catSoda, categoryId: catSoda.id,
      costPrice: { pack: 118, carton: 1300 },
      sellPrice: { pack: 142, carton: 1580 },
      remaining: 420, minStock: 50,
      piecesPerPack: 6, packPerCarton: 4,
      productDimensions: { length: 6.5, width: 6.5, height: 12, weight: 0.35 },
      cartonDimensions: { length: 40, width: 27, height: 25, weight: 9 },
    },
    {
      barcode: '8850999000007',
      name: 'Fanta Orange 325ml',
      brand: brands['Fanta'], brandId: brands['Fanta'].id,
      category: catSoda, categoryId: catSoda.id,
      costPrice: { pack: 118, carton: 1300 },
      sellPrice: { pack: 142, carton: 1580 },
      remaining: 380, minStock: 50,
      piecesPerPack: 6, packPerCarton: 4,
    },
    {
      barcode: '8850999000008',
      name: 'Singha Soda 325ml',
      brand: brands['Singha'], brandId: brands['Singha'].id,
      category: catSoda, categoryId: catSoda.id,
      costPrice: { pack: 90, carton: 990 },
      sellPrice: { pack: 115, carton: 1280 },
      remaining: 250, minStock: 40,
      piecesPerPack: 6, packPerCarton: 4,
    },
    {
      barcode: '8850999000009',
      name: 'Singha Drinking Water 600ml',
      brand: brands['Singha'], brandId: brands['Singha'].id,
      category: catWater, categoryId: catWater.id,
      costPrice: { pack: 50, carton: 580 },
      sellPrice: { pack: 70, carton: 800 },
      remaining: 1500, minStock: 200,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000010',
      name: 'Chang Drinking Water 1.5L',
      brand: brands['Chang'], brandId: brands['Chang'].id,
      category: catWater, categoryId: catWater.id,
      costPrice: { pack: 70, carton: 780 },
      sellPrice: { pack: 95, carton: 1080 },
      remaining: 800, minStock: 100,
      piecesPerPack: 6, packPerCarton: 2,
      productDimensions: { length: 9, width: 9, height: 32, weight: 1.55 },
    },
    {
      barcode: '8850999000011',
      name: 'Oishi Green Tea Honey Lemon 380ml',
      brand: brands['Oishi'], brandId: brands['Oishi'].id,
      category: catTea, categoryId: catTea.id,
      costPrice: { pack: 130, carton: 1450 },
      sellPrice: { pack: 160, carton: 1800 },
      remaining: 600, minStock: 60,
      piecesPerPack: 12, packPerCarton: 2,
    },
    {
      barcode: '8850999000012',
      name: 'Oishi Green Tea Original 500ml',
      brand: brands['Oishi'], brandId: brands['Oishi'].id,
      category: catTea, categoryId: catTea.id,
      costPrice: { pack: 140, carton: 1560 },
      sellPrice: { pack: 175, carton: 1950 },
      remaining: 540, minStock: 60,
      piecesPerPack: 12, packPerCarton: 2,
    },
    {
      barcode: '8850999000013',
      name: 'Lipton Lemon Tea 250ml',
      brand: brands['Lipton'], brandId: brands['Lipton'].id,
      category: catTea, categoryId: catTea.id,
      costPrice: { pack: 95, carton: 1050 },
      sellPrice: { pack: 120, carton: 1320 },
      remaining: 700, minStock: 70,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000014',
      name: 'Tipco Orange Juice 1L',
      brand: brands['Tipco'], brandId: brands['Tipco'].id,
      category: catJuice, categoryId: catJuice.id,
      costPrice: { pack: 280, carton: 3100 },
      sellPrice: { pack: 340, carton: 3800 },
      remaining: 180, minStock: 30,
      piecesPerPack: 6, packPerCarton: 2,
    },
    {
      barcode: '8850999000015',
      name: 'Tipco Apple Juice 1L',
      brand: brands['Tipco'], brandId: brands['Tipco'].id,
      category: catJuice, categoryId: catJuice.id,
      costPrice: { pack: 280, carton: 3100 },
      sellPrice: { pack: 340, carton: 3800 },
      remaining: 160, minStock: 30,
      piecesPerPack: 6, packPerCarton: 2,
    },
    {
      barcode: '8850999000016',
      name: 'Mali Coconut Juice 350ml',
      brand: brands['Mali'], brandId: brands['Mali'].id,
      category: catJuice, categoryId: catJuice.id,
      costPrice: { pack: 110, carton: 1200 },
      sellPrice: { pack: 140, carton: 1560 },
      remaining: 320, minStock: 50,
      piecesPerPack: 12, packPerCarton: 2,
    },
    {
      barcode: '8850999000017',
      name: 'Mama Tom Yum Kung 60g',
      brand: brands['Mama'], brandId: brands['Mama'].id,
      category: catNoodle, categoryId: catNoodle.id,
      costPrice: { pack: 60, carton: 660 },
      sellPrice: { pack: 80, carton: 880 },
      remaining: 2400, minStock: 300,
      piecesPerPack: 10, packPerCarton: 6,
    },
    {
      barcode: '8850999000018',
      name: 'Mama Pad Kee Mao 60g',
      brand: brands['Mama'], brandId: brands['Mama'].id,
      category: catNoodle, categoryId: catNoodle.id,
      costPrice: { pack: 60, carton: 660 },
      sellPrice: { pack: 80, carton: 880 },
      remaining: 1800, minStock: 250,
      piecesPerPack: 10, packPerCarton: 6,
    },
    {
      barcode: '8850999000019',
      name: 'Yum Yum Pork 60g',
      brand: brands['Yum Yum'], brandId: brands['Yum Yum'].id,
      category: catNoodle, categoryId: catNoodle.id,
      costPrice: { pack: 55, carton: 600 },
      sellPrice: { pack: 75, carton: 820 },
      remaining: 1500, minStock: 200,
      piecesPerPack: 10, packPerCarton: 6,
    },
    {
      barcode: '8850999000020',
      name: 'Mama Cup Tom Yum 60g',
      brand: brands['Mama'], brandId: brands['Mama'].id,
      category: catNoodle, categoryId: catNoodle.id,
      costPrice: { pack: 96, carton: 1080 },
      sellPrice: { pack: 130, carton: 1450 },
      remaining: 480, minStock: 60,
      piecesPerPack: 6, packPerCarton: 4,
    },
    {
      barcode: '8850999000021',
      name: 'Knorr Chicken Cube 60g',
      brand: brands['Knorr'], brandId: brands['Knorr'].id,
      category: catSeasoning, categoryId: catSeasoning.id,
      costPrice: { pack: 145, carton: 1620 },
      sellPrice: { pack: 180, carton: 2000 },
      remaining: 360, minStock: 50,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000022',
      name: 'Knorr Pork Soup Powder 75g',
      brand: brands['Knorr'], brandId: brands['Knorr'].id,
      category: catSeasoning, categoryId: catSeasoning.id,
      costPrice: { pack: 165, carton: 1850 },
      sellPrice: { pack: 200, carton: 2250 },
      remaining: 240, minStock: 40,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000023',
      name: "Lay's BBQ 75g",
      brand: brands["Lay's"], brandId: brands["Lay's"].id,
      category: catSnack, categoryId: catSnack.id,
      costPrice: { pack: 200, carton: 2200 },
      sellPrice: { pack: 240, carton: 2600 },
      remaining: 280, minStock: 50,
      piecesPerPack: 10, packPerCarton: 3,
    },
    {
      barcode: '8850999000024',
      name: "Lay's Nori Seaweed 75g",
      brand: brands["Lay's"], brandId: brands["Lay's"].id,
      category: catSnack, categoryId: catSnack.id,
      costPrice: { pack: 200, carton: 2200 },
      sellPrice: { pack: 240, carton: 2600 },
      remaining: 220, minStock: 50,
      piecesPerPack: 10, packPerCarton: 3,
    },
    {
      barcode: '8850999000025',
      name: 'Pringles Original 110g',
      brand: brands['Pringles'], brandId: brands['Pringles'].id,
      category: catSnack, categoryId: catSnack.id,
      costPrice: { pack: 380, carton: 4200 },
      sellPrice: { pack: 460, carton: 5100 },
      remaining: 144, minStock: 24,
      piecesPerPack: 12, packPerCarton: 2,
      productDimensions: { length: 7, width: 7, height: 23, weight: 0.13 },
    },
    {
      barcode: '8850999000026',
      name: 'Pringles Sour Cream & Onion 110g',
      brand: brands['Pringles'], brandId: brands['Pringles'].id,
      category: catSnack, categoryId: catSnack.id,
      costPrice: { pack: 380, carton: 4200 },
      sellPrice: { pack: 460, carton: 5100 },
      remaining: 96, minStock: 24,
      piecesPerPack: 12, packPerCarton: 2,
    },
    {
      barcode: '8850999000027',
      name: 'Pocky Chocolate 47g',
      brand: brands['Pocky'], brandId: brands['Pocky'].id,
      category: catCookie, categoryId: catCookie.id,
      costPrice: { pack: 220, carton: 2400 },
      sellPrice: { pack: 280, carton: 3100 },
      remaining: 360, minStock: 50,
      piecesPerPack: 12, packPerCarton: 6,
    },
    {
      barcode: '8850999000028',
      name: 'Pocky Strawberry 47g',
      brand: brands['Pocky'], brandId: brands['Pocky'].id,
      category: catCookie, categoryId: catCookie.id,
      costPrice: { pack: 220, carton: 2400 },
      sellPrice: { pack: 280, carton: 3100 },
      remaining: 300, minStock: 50,
      piecesPerPack: 12, packPerCarton: 6,
    },
    {
      barcode: '8850999000029',
      name: 'Bento Squid Sweet & Spicy 24g',
      brand: brands['Bento'], brandId: brands['Bento'].id,
      category: catSnack, categoryId: catSnack.id,
      costPrice: { pack: 145, carton: 1620 },
      sellPrice: { pack: 180, carton: 2000 },
      remaining: 600, minStock: 100,
      piecesPerPack: 12, packPerCarton: 6,
    },
    {
      barcode: '8850999000030',
      name: 'Dutch Mill UHT Plain 180ml',
      brand: brands['Dutch Mill'], brandId: brands['Dutch Mill'].id,
      category: catDairy, categoryId: catDairy.id,
      costPrice: { pack: 130, carton: 1450 },
      sellPrice: { pack: 165, carton: 1850 },
      remaining: 720, minStock: 100,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000031',
      name: 'Dutch Mill Yogurt Drink Strawberry 180ml',
      brand: brands['Dutch Mill'], brandId: brands['Dutch Mill'].id,
      category: catDairy, categoryId: catDairy.id,
      costPrice: { pack: 150, carton: 1680 },
      sellPrice: { pack: 190, carton: 2120 },
      remaining: 480, minStock: 80,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000032',
      name: 'Foremost Chocolate Milk 225ml',
      brand: brands['Foremost'], brandId: brands['Foremost'].id,
      category: catDairy, categoryId: catDairy.id,
      costPrice: { pack: 140, carton: 1560 },
      sellPrice: { pack: 175, carton: 1950 },
      remaining: 540, minStock: 80,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000033',
      name: 'Foremost Strawberry Milk 225ml',
      brand: brands['Foremost'], brandId: brands['Foremost'].id,
      category: catDairy, categoryId: catDairy.id,
      costPrice: { pack: 140, carton: 1560 },
      sellPrice: { pack: 175, carton: 1950 },
      remaining: 3, minStock: 80,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000034',
      name: 'Nestlé Bear Brand 140ml',
      brand: brands['Nestlé'], brandId: brands['Nestlé'].id,
      category: catDairy, categoryId: catDairy.id,
      costPrice: { pack: 175, carton: 1950 },
      sellPrice: { pack: 220, carton: 2450 },
      remaining: 360, minStock: 60,
      piecesPerPack: 12, packPerCarton: 4,
    },
    {
      barcode: '8850999000035',
      name: 'Nescafé Gold 100g',
      brand: brands['Nestlé'], brandId: brands['Nestlé'].id,
      category: catTea, categoryId: catTea.id,
      costPrice: { pack: 380, carton: 4200 },
      sellPrice: { pack: 460, carton: 5100 },
      remaining: 60, minStock: 20,
      piecesPerPack: 6, packPerCarton: 4,
    },
  ];
  const products: Record<string, Product> = {};
  for (const p of productData) {
    let product = await productRepo.findOneBy({ barcode: p.barcode });
    if (!product) product = await productRepo.save(productRepo.create(p));
    products[p.barcode] = product;
  }

  // ─── Orders ───────────────────────────────────────────────────────────────
  console.log('🛒 Seeding orders...');
  const existingOrders = await orderRepo.count();
  if (existingOrders === 0) {
    // Order 1 — Shopee
    const order1 = await orderRepo.save(orderRepo.create({
      id: orderId(),
      shop: shops[0],
      employee: employees[0],
    }));
    await detailRepo.save([
      detailRepo.create({ id: detailId(), order: order1, orderId: order1.id, product: products['8850999000001'], quantityPack: 5, quantityCarton: 2 }),
      detailRepo.create({ id: detailId(), order: order1, orderId: order1.id, product: products['8850999000003'], quantityPack: 3, quantityCarton: 1 }),
    ]);

    // Order 2 — Lazada
    const order2 = await orderRepo.save(orderRepo.create({
      id: orderId(),
      shop: shops[1],
      employee: employees[1],
    }));
    await detailRepo.save([
      detailRepo.create({ id: detailId(), order: order2, orderId: order2.id, product: products['8850999000002'], quantityPack: 10, quantityCarton: 0 }),
      detailRepo.create({ id: detailId(), order: order2, orderId: order2.id, product: products['8850999000004'], quantityPack: 2, quantityCarton: 1 }),
    ]);

    // Order 3 — TikTok
    const order3 = await orderRepo.save(orderRepo.create({
      id: orderId(),
      shop: shops[2],
      employee: employees[2],
    }));
    await detailRepo.save([
      detailRepo.create({ id: detailId(), order: order3, orderId: order3.id, product: products['8850999000005'], quantityPack: 4, quantityCarton: 2 }),
    ]);
  }

  // ─── Stock Entries ────────────────────────────────────────────────────────
  console.log('📊 Seeding stock entries...');
  const existingStk = await stkRepo.count();
  if (existingStk === 0) {
    const stkData = [
      { barcode: '8850999000001', type: StockEntryType.IN,     qty: 500, emp: employees[0], note: 'รับสินค้าจากโรงงานครั้งแรก' },
      { barcode: '8850999000002', type: StockEntryType.IN,     qty: 300, emp: employees[0], note: 'รับสินค้าชุดเปิดตัว' },
      { barcode: '8850999000003', type: StockEntryType.IN,     qty: 1200, emp: employees[0], note: 'สต้อกเริ่มต้น' },
      { barcode: '8850999000004', type: StockEntryType.IN,     qty: 50,  emp: employees[2], note: 'สต้อกเริ่มต้น' },
      { barcode: '8850999000004', type: StockEntryType.ADJUST, qty: 4,   emp: employees[2], note: 'ปรับสต้อกหลังตรวจนับ' },
      { barcode: '8850999000005', type: StockEntryType.IN,     qty: 30,  emp: employees[0], note: 'รับสินค้าเพิ่ม' },
      { barcode: '8850999000005', type: StockEntryType.ADJUST, qty: 2,   emp: employees[2], note: 'ของแตกหัก 28 ชิ้น' },
    ];

    for (const s of stkData) {
      const product = await productRepo.findOneBy({ barcode: s.barcode });
      const prev = product.remaining;
      const next = s.type === StockEntryType.ADJUST ? s.qty : prev + s.qty;

      await stkRepo.save(stkRepo.create({
        id: stkId(),
        productBarcode: s.barcode,
        product,
        type: s.type,
        quantity: s.qty,
        previousRemaining: prev,
        newRemaining: next,
        employee: s.emp,
        employeeId: s.emp.id,
        note: s.note,
      }));
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────');
  console.log('🔑 Login credentials:');
  console.log('   superadmin / superadmin1234  (SuperAdmin)');
  console.log('   operator   / operator1234    (Operator)');
  console.log('   warehouse  / warehouse1234   (Warehouse)');
  console.log('─────────────────────────────────────');
  console.log(`📦 Products seeded: ${productData.length} items`);
  console.log('   ⚠️  Low-stock items:');
  console.log('   8850999000004  Lay\'s Classic 75g           remaining: 4');
  console.log('   8850999000005  Coca-Cola Bottle 1.25L      remaining: 2');
  console.log('   8850999000033  Foremost Strawberry Milk    remaining: 3');
  console.log('─────────────────────────────────────');

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
