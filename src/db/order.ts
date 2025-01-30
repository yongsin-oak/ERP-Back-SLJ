import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { employeeTable } from "./employee";
import { productTable } from "./product";
import { v4 } from "uuid";

export const platform = pgEnum("Platform", ["Shopee", "Lazada", "Tiktok"]);
export const shopName = pgEnum("ShopName", [
  "SupLonJai",
  "JaoSua",
  "SuperA",
  "SomWang",
]);
export const orderTable = pgTable("Order", {
  id: varchar({ length: 64 }).primaryKey(),
  employeeId: integer().notNull(),
  platform: platform().notNull(),
  shop: shopName().notNull(),
  totalPrice: integer(),
  totalGet: integer(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
export const orderRelations = relations(orderTable, ({ many, one }) => ({
  orderDetail: many(orderDetailTable),
  employee: one(employeeTable, {
    fields: [orderTable.employeeId],
    references: [employeeTable.id],
  }),
}));
export const orderDetailTable = pgTable("OrderDetail", {
  id: text()
    .primaryKey()
    .$defaultFn(() => v4()),
  orderId: varchar({ length: 64 }).notNull(),
  productBarcode: varchar({ length: 64 }).notNull(),
  productAmount: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
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

export const tableOrder = {
  order: orderTable,
  orderDatail: orderDetailTable,
} as const;

export type TableOrder = typeof tableOrder;
