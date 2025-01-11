import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { employeeTable } from "./employee";
import { productTable } from "./product";

export const platform = pgEnum("Platform", ["Shopee", "Lazada", "Tiktok"]);
export const shopName = pgEnum("ShopName", [
  "SupLonJai",
  "JaoSua",
  "SuperA",
  "SomWang",
]);
export const orderTable = pgTable("Order", {
  id: varchar({ length: 256 }),
  employeeId: integer().notNull(),
  platform: platform().notNull(),
  shop: shopName().notNull(),
  totalPrice: integer(),
  totalGet: integer(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
});
export const orderRelations = relations(orderTable, ({ many, one }) => ({
  orderDetail: many(orderDetailTable),
  employee: one(employeeTable, {
    fields: [orderTable.employeeId],
    references: [employeeTable.id],
  }),
}));
export const orderDetailTable = pgTable("OrderDetail", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: varchar({ length: 256 }).notNull(),
  productBarcode: varchar({ length: 256 }).notNull(),
  productAmount: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
});
export const orderDetailRelations = relations(orderDetailTable, ({ one }) => ({
  order: one(orderTable, {
    fields: [orderDetailTable.orderId],
    references: [orderTable.id],
  }),
  product: one(productTable, {
    fields: [orderDetailTable.productBarcode],
    references: [productTable.barcode],
  }),
}));
