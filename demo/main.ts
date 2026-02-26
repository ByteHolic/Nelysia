import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { buildPlugin } from "@byteholic/nelysia";
import { AppPlugin } from "./app.plugin";

const port = Number(process.env.PORT ?? 3000);

new Elysia()
  .use(swagger({ documentation: { info: { title: "Nelysia Demo", version: "0.1.0" } } }))
  .use(buildPlugin(AppPlugin))
  .listen(port);

console.log(`🚀 http://localhost:${port}`);
console.log(`📖 http://localhost:${port}/swagger`);
console.log(`🔌 ws://localhost:${port}/chat/:room`);
