import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orderTable } from "./order";
import { bankKeys } from "../bankName";

export const attendanceTpye = pgEnum("AttendanceType", [
  "Absent",
  "Late",
  "Sick",
  "Vacation",
  "Personal",
]);
export const departmentList = pgEnum("Department", [
  "HR",
  "Accounting",
  "Admin",
  "Owner",
  "Operator",
]);
export const banksList = pgEnum("Bank", ["none", ...bankKeys]);
export const employeeTable = pgTable("Employee", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar({ length: 256 }).notNull(),
  lastName: varchar({ length: 256 }).notNull(),
  nickname: varchar({ length: 256 }).notNull(),
  phoneNumber: varchar({ length: 15 }).notNull(),
  department: departmentList().notNull(),
  startDate: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
  bank: banksList().notNull(),
  bankAccount: varchar({ length: 256 }).notNull(),
});

export const employeeRelations = relations(employeeTable, ({ many }) => ({
  attendance: many(attendanceTable),
  order: many(orderTable),
}));

export const attendanceTable = pgTable("Attendance", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer().notNull(),
  date: timestamp().notNull(),
  type: attendanceTpye().notNull(),
  reason: varchar({ length: 256 }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
});
export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  employee: one(employeeTable, {
    fields: [attendanceTable.employeeId],
    references: [employeeTable.id],
  }),
}));
