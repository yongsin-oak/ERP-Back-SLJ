import { PrismaClient } from "@prisma/client";
import Elysia from "elysia";

const orderDetails = (app: Elysia, db: PrismaClient) => {
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
