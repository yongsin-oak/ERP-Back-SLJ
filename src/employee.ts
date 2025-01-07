import { PrismaClient } from "@prisma/client";
import Elysia, { t } from "elysia";

const employee = (app: Elysia, db: PrismaClient) => {
  app.post(
    "/employee",
    async ({ body }) => db.employee.create({ data: body }),
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
        bankName: t.Enum({
          BBL: "BBL",
          KBANK: "KBANK",
          KTB: "KTB",
          TTB: "TTB",
          SCB: "SCB",
          KKP: "KKP",
          BAY: "BAY",
          CIMBT: "CIMBT",
          TISCO: "TISCO",
          UOBT: "UOBT",
          CREDIT: "CREDIT",
          LHFG: "LHFG",
          ICBCT: "ICBCT",
          SME: "SME",
          BAAC: "BAAC",
          EXIM: "EXIM",
          GSB: "GSB",
          GHB: "GHB",
        }),
      }),
    }
  );
  app.get("/employee", async ({ query: { page, limit } }) => {
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
  });
};

export default employee;
