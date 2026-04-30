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
  console.log('📦 Products (barcode):');
  console.log('   8850999000001  Coca-Cola Can 325ml    remaining: 500');
  console.log('   8850999000002  Pepsi Can 325ml         remaining: 300');
  console.log('   8850999000003  Nestlé Pure Life 600ml  remaining: 1200');
  console.log('   8850999000004  Lay\'s Classic 75g       remaining: 4  ← low stock');
  console.log('   8850999000005  Coca-Cola Bottle 1.25L  remaining: 2  ← low stock');
  console.log('─────────────────────────────────────');

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
