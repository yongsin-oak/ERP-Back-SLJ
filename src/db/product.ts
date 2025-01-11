import {
  doublePrecision,
  integer,
  pgTable,
  real,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { orderDetailTable } from "./order";
import { relations } from "drizzle-orm";
export const productTable = pgTable("Product", {
  barcode: varchar({ length: 256 }).notNull().unique(),
  category: varchar({ length: 256 }),
  brand: varchar({ length: 256 }),
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
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
export const productRelations = relations(productTable, ({ many }) => ({
  orderDetail: many(orderDetailTable),
}));
