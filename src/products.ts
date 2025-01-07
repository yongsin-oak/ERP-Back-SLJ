import { PrismaClient } from "@prisma/client";
import { Elysia, t } from "elysia";

const products = (app: Elysia, db: PrismaClient) => {
  app
    .post(
      "/product",
      async ({ body }) => db.products.createMany({ data: body }),
      {
        body: t.Array(
          t.Object({
            barcode: t.String(),
            name: t.String(),
            costPrice: t.Number(),
            currentPrice: t.Number(),
            currentAmount: t.Number(),
          })
        ),
      }
    )
    .get("/product", async ({ query: { page, limit } }) => {
      const products = await db.products.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });
      const total = await db.products.count();
      return {
        data: products,
        limit: Number(limit),
        page: Number(page),
        total,
      };
    });
};

export default products;
