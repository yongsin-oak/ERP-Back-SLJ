import Elysia, { t } from "elysia";
import { bankObjectSchema } from "./bankName";
import { departmentObject } from "./department";
import banks from "./json/banks.json";
import { db } from ".";
import { employeeTable, tableEmployee } from "./db/employee";
import { createInsertSchema } from "drizzle-typebox";

const _employee = createInsertSchema(tableEmployee.employee, {
  phoneNumber: t.Optional(
    t.Nullable(t.String({ maxLength: 10, minLength: 10 }))
  ),
});
const _employeeInsert = createInsertSchema(tableEmployee.employee, {
  phoneNumber: t.Optional(
    t.Nullable(
      t.String({
        maxLength: 10,
        minLength: 10,
        error: "Phone number must be 10 digits",
      })
    )
  ),
  department: t.Enum(departmentObject, { error: "Department is not valid" }),
  bank: t.Enum(bankObjectSchema, { error: "Bank is not valid" }),
  bankAccount: t.String({
    maxLength: 20,
    error: "Bank account must be less than 20 characters",
  }),
  firstName: t.String({ maxLength: 256, error: "First name is too long" }),
  lastName: t.String({ maxLength: 256, error: "Last name is too long" }),
  nickname: t.String({ maxLength: 256, error: "Nickname is too long" }),
  startDate: t.Date({ error: "Start date is not valid" }),
});
const employee = (app: Elysia) => {
  app
    .post(
      "/employee",
      async ({ body, error }) => {
        try {
          await db.insert(employeeTable).values(body);
          return error(200, {
            message: "Employee created successfully",
          });
        } catch (err: any) {
          throw new Error(err.message);
        }
      },
      {
        body: t.Omit(_employeeInsert, ["id", "createdAt", "updatedAt"]),
        response: t.Object({
          message: t.String(),
        }),
      }
    )
    .get(
      "/employee",
      async ({ query: { page, limit } }) => {
        try {
          const employee = await db
            .select()
            .from(employeeTable)
            .limit(Number(limit))
            .offset((Number(page) - 1) * Number(limit));
          const total = await db.$count(employeeTable);
          return {
            data: employee,
            limit: Number(limit),
            page: Number(page),
            total,
          };
        } catch (err: any) {
          throw new Error(err.message);
        }
      },
      {
        query: t.Object({
          page: t.Number(),
          limit: t.Number(),
        }),
        response: t.Object({
          data: t.Array(t.Omit(_employee, [])),
          limit: t.Number(),
          page: t.Number(),
          total: t.Number(),
        }),
      }
    )
    .get(
      "/bankNames",
      () => {
        return {
          data: banks,
        };
      },
      {
        response: t.Object({
          data: t.Record(
            t.String(),
            t.Record(
              t.String(),
              t.Object({
                code: t.String(),
                color: t.String(),
                official_name: t.String(),
                thai_name: t.String(),
                nice_name: t.String(),
              })
            )
          ),
        }),
      }
    );
};
export default employee;
