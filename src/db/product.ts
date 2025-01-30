import {
  doublePrecision,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { orderDetailTable } from "./order";
import { relations } from "drizzle-orm";
export const productTable = pgTable("Product", {
  barcode: varchar({ length: 64 }).notNull().primaryKey(),
  category: varchar({ length: 32 }),
  brand: varchar({ length: 32 }),
  name: varchar({ length: 256 }).notNull(),
  costPrice: doublePrecision().notNull(),
  currentPrice: doublePrecision().notNull(),
  currentAmount: integer().notNull(),
  weight: doublePrecision(),
  width: doublePrecision(),
  height: doublePrecision(),
  length: doublePrecision(),
  packagePerCarton: integer(),
  unitPerPackage: integer(),
  updatedAt: timestamp().defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
export const productRelations = relations(productTable, ({ many }) => ({
  orderDetail: many(orderDetailTable),
}));

export const tableProduct = {
  product: productTable,
} as const;

export type TableProduct = typeof tableProduct;
