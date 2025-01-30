import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import products from "./products";
import orders from "./orders";
import employee from "./employee";
import orderDetails from "./orderDetails";
import swagger from "@elysiajs/swagger";
import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";

export const db = drizzle(process.env.DATABASE_URL!);
// const result = await db.execute("SELECT * FROM Order");
export const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "SLJ-ERP API",
          version: "1.0.0",
        },
      },
    })
  )
  .use(cors())
  .get("/", () => "Hello Elysia");
employee(app);
products(app);
// orders(app, db);
// orderDetails(app, db);
app.listen(3000, () => {
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
});

export default app;
