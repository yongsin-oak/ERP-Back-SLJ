import Elysia from "elysia";

const test = (app: Elysia) => {
    app.get("/test", () => "testasd");
}
export default test;