import { PrismaClient } from "@prisma/client";
import { NodePgClient } from "drizzle-orm/node-postgres";
import Elysia from "elysia";

const orderDetails = (app: Elysia, db: NodePgClient) => {
  app.get("/orderDetails", async ({ query: { page, limit } }) => {
    const orderDetails = await db.orderDetails.findMany({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await db.orderDetails.count();
    return {
      data: orderDetails,
      limit: Number(limit),
      page: Number(page),
      total,
    };
  });
};
export default orderDetails;
