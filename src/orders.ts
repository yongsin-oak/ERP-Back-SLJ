import { PrismaClient } from "@prisma/client";
import { Elysia, t } from "elysia";

const orders = (app: Elysia, db: PrismaClient) => {
  app.post(
    "/order",
    async ({ body }) => {
      // เริ่มต้น transaction
      const { products, ...orderData } = body; // products คือลิสต์ของสินค้าที่จะสั่งซื้อ

      const result = await db.$transaction(async (tx) => {
        // 1. สร้างข้อมูลในตาราง Orders
        const order = await tx.orders.create({
          data: {
            id: orderData.id,
            employeeId: orderData.employeeId,
            platform: orderData.platform,
            shop: orderData.shop,
          },
        });

        // 2. สร้างข้อมูลในตาราง OrderDetails สำหรับแต่ละสินค้าที่อยู่ในคำสั่งซื้อ
        const orderDetails = await Promise.all(
          products.map((product) => {
            return tx.orderDetails.create({
              data: {
                orderId: order.id, // ใช้ id ของคำสั่งซื้อที่เพิ่งสร้าง
                productBarcode: product.productBarcode,
                productAmount: product.productAmount,
              },
            });
          })
        );
        // คืนค่าผลลัพธ์ที่ได้
        return {
          order,
          orderDetails,
        };
      });

      return result;
    },
    {
      body: t.Object({
        id: t.String(),
        employeeId: t.Number(),
        platform: t.Enum({
          Shopee: "Shopee",
          Lazada: "Lazada",
          Tiktok: "Tiktok",
          StoreFront: "StoreFront",
          Direct: "Direct",
          Delivery: "Delivery",
        }),
        shop: t.Enum({
          SupLonJai: "SupLonJai",
          JaoSua: "JaoSua",
          SuperA: "SuperA",
          SomWang: "SomWang",
        }),
        products: t.Array(
          t.Object({
            productBarcode: t.String(),
            productAmount: t.Number(),
          })
        ),
      }),
    }
  );

  app.get("/order", async ({ query: { page, limit } }) => {
    const orders = await db.orders.findMany({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await db.orders.count();
    return {
      data: orders,
      limit: Number(limit),
      page: Number(page),
      total,
    };
  });
};

export default orders;
