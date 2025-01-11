import Elysia, { t } from "elysia";
import { bankObjectSchema } from "./bankName";
import { departmentObject } from "./department";
import banks from "./json/banks.json";
import { db } from ".";
import { employeeTable } from "./db/employee";

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
        body: t.Object({
          firstName: t.String(),
          lastName: t.String(),
          nickname: t.String(),
          phoneNumber: t.String(),
          department: t.Enum(departmentObject),
          startDate: t.Date(),
          bankAccount: t.String(),
          bank: t.Enum(bankObjectSchema),
        }),
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
          data: t.Array(
            t.Object({
              id: t.Number(),
              firstName: t.String(),
              lastName: t.String(),
              nickname: t.String(),
              phoneNumber: t.String(),
              department: t.Enum(departmentObject),
              startDate: t.Date(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
              bankAccount: t.String(),
              bank: t.Enum(bankObjectSchema),
            })
          ),
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
