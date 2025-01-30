import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orderTable } from "./order";
import { bankKeys } from "../bankName";
import { v4 } from "uuid";

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
  id: text()
    .primaryKey()
    .$defaultFn(() => v4()),
  firstName: varchar({ length: 256 }).notNull(),
  lastName: varchar({ length: 256 }).notNull(),
  nickname: varchar({ length: 256 }).notNull(),
  phoneNumber: varchar({ length: 10 }),
  department: departmentList().notNull(),
  startDate: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
  bank: banksList(),
  bankAccount: varchar({ length: 20 }),
});

export const employeeRelations = relations(employeeTable, ({ many }) => ({
  attendance: many(attendanceTable),
  order: many(orderTable),
}));

export const attendanceTable = pgTable("Attendance", {
  id: text()
    .primaryKey()
    .$defaultFn(() => v4()),
  employeeId: integer().notNull(),
  date: timestamp().notNull(),
  type: attendanceTpye().notNull(),
  reason: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  employee: one(employeeTable, {
    fields: [attendanceTable.employeeId],
    references: [employeeTable.id],
  }),
}));

export const tableEmployee = {
  employee: employeeTable,
  attendance: attendanceTable,
} as const;

export type TableEmployeeType = typeof tableEmployee;
