import { Elysia, t } from "elysia";
import { db } from ".";
import { productTable } from "./db/product";

const products = (app: Elysia) => {
  app
    .post(
      "/products",
      async ({ body, error }) => {
        try {
          await db.insert(productTable).values(body.data);
          return error(200, {
            message: "Products created successfully",
          });
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
      {
        body: t.Object({
          data: t.Array(
            t.Object({
              barcode: t.String(),
              category: t.Optional(t.String()),
              brand: t.Optional(t.String()),
              name: t.String(),
              costPrice: t.Number(),
              currentPrice: t.Number(),
              currentAmount: t.Number(),
              weight: t.Optional(t.Number()),
              width: t.Optional(t.Number()),
              height: t.Optional(t.Number()),
              length: t.Optional(t.Number()),
              packagePerCarton: t.Optional(t.Number()),
              unitPerPackage: t.Optional(t.Number()),
            })
          ),
        }),
        response: t.Object({
          message: t.String(),
        }),
      }
    )
    .get(
      "/products",
      async ({ query: { page, limit } }) => {
        try {
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
        } catch (err: any) {
          throw new Error(err.message);
        }
      }
      // {
      //   query: t.Object({
      //     page: t.Number(),
      //     limit: t.Number(),
      //   }),
      //   response: {
      //     data: t.Array(
      //       t.Object({
      //         barcode: t.String(),
      //         category: t.Optional(t.String()),
      //         brand: t.Optional(t.String()),
      //         name: t.String(),
      //         costPrice: t.Number(),
      //         currentPrice: t.Number(),
      //         currentAmount: t.Number(),
      //         weight: t.Optional(t.Number()),
      //         width: t.Optional(t.Number()),
      //         height: t.Optional(t.Number()),
      //         length: t.Optional(t.Number()),
      //         packagePerCarton: t.Optional(t.Number()),
      //         unitPerPackage: t.Optional(t.Number()),
      //       })
      //     ),
      //     limit: t.Number(),
      //     page: t.Number(),
      //     total: t.Number(),
      //   },
      // }
    );
};

export default products;
