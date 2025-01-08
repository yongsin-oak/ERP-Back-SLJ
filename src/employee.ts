import { PrismaClient } from "@prisma/client";
import Elysia, { t } from "elysia";
import { bankNameList, bankNameObject } from "./bankName";

const employee = (app: Elysia, db: PrismaClient) => {
  app
    .post(
      "/employees",
      async ({ body, error }) => {
        try {
          db.employee.create({ data: body });
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
          department: t.Enum({
            HR: "HR",
            Accounting: "Accounting",
            Admin: "Admin",
            Owner: "Owner",
            Operator: "Operator",
          }),
          startDate: t.Date(),
          bankAccount: t.String(),
          bankName: t.Enum(bankNameObject),
        }),
        response: t.Object({
          message: t.String(),
        }),
      }
    )
    .get(
      "/employees",
      async ({ query: { page, limit } }) => {
        try {
          const employee = await db.employee.findMany({
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
          });
          const total = await db.employee.count();
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
              department: t.Enum({
                HR: "HR",
                Accounting: "Accounting",
                Admin: "Admin",
                Owner: "Owner",
                Operator: "Operator",
              }),
              startDate: t.Date(),
              bankAccount: t.String(),
              bankName: t.Enum(bankNameObject),
            })
          ),
          limit: t.Number(),
          page: t.Number(),
          total: t.Number(),
        }),
      }
    )
    .get("/bankNameList", () => {
      return {
        data: bankNameList,
      };
    });
};
export default employee;
