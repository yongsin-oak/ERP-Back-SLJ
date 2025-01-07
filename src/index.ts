import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import test from "./test";
import { PrismaClient } from "@prisma/client";
import products from "./products";
import orders from "./orders";
import employee from "./employee";
import orderDetails from "./orderDetails";
import swagger from "@elysiajs/swagger";

const db = new PrismaClient();
const app = new Elysia()
  .use(
    swagger({
      path: "/v2/swagger",
      documentation: {
        info: {
          title: "SLJ-ERP API",
          version: "1.0.0",
        },
      },
    })
  )
  .use(cors())
  .get("/", () => "Hello Elysia")
  .get("/auth", () => "auth");
test(app);
products(app, db);
orders(app, db);
employee(app, db);
orderDetails(app, db);
app.listen(3000, () => {
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
});

export default app;
