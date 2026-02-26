# Nelysia

> NestJS-style modular framework built natively on [ElysiaJS](https://elysiajs.com) + Bun.

[![npm version](https://img.shields.io/npm/v/@byteholic/nelysia)](https://www.npmjs.com/package/@byteholic/nelysia)
[![bun](https://img.shields.io/badge/runtime-bun-black)](https://bun.sh)
[![license](https://img.shields.io/npm/l/@byteholic/nelysia)](./LICENSE)

---

## Features

- 🧩 **`@Plugin`** — NestJS-style `@Module` powered by native Elysia `.use()`
- 💉 **`@Service` + `@Inject`** — Lightweight DI container
- 🌐 **`@Controller` + HTTP verbs** — `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
- 🔌 **`@WsController` + `@Ws`** — Native WebSocket support with pub/sub
- 🎯 **Context decorators** — `@Body`, `@Query`, `@Params`, `@Path`, `@Headers`, `@Cookie`
- 🛡️ **`@BeforeHandle`** — Per-route guards
- 📋 **`@Schema`** — Elysia `t` validation per route
- 📖 **`@Detail`** — OpenAPI / Swagger metadata
- ⚙️ **`@Macro`** — Elysia `.macro()` as class-based decorators
- 🔁 **Lifecycle hooks** — `onRequest`, `onError`, `onAfterResponse`, etc. in `@Plugin`

---

## Install

```bash
bun add @byteholic/nelysia elysia
bun add -d bun-types
```

### `tsconfig.json` requirements

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "strict": true
  }
}
```

---

## Quick Start

```typescript
// main.ts
import { Elysia } from "elysia";
import { buildPlugin } from "@byteholic/nelysia";
import { AppPlugin } from "./app.plugin";

new Elysia()
  .use(buildPlugin(AppPlugin))
  .listen(3000);
```

---

## Core Concepts

### `@Service` — Injectable class

Register a class in the DI container. Pass deps as an explicit array.

```typescript
import { Service } from "@byteholic/nelysia";

@Service()
export class UserRepo {
  private users = [{ id: 1, name: "Alice" }];
  findAll() { return this.users; }
}

@Service([UserRepo])
export class UsersService {
  constructor(private repo: UserRepo) {}
  all() { return this.repo.findAll(); }
}
```

### `@Inject` — Per-parameter injection

Use on constructor parameters instead of (or alongside) `@Service([])`.

```typescript
import { Inject, Controller, Get } from "@byteholic/nelysia";

@Controller("/users")
export class UsersController {
  constructor(@Inject(UsersService) private svc: UsersService) {}

  @Get("/")
  getAll() { return this.svc.all(); }
}
```

Both styles are equivalent:

```typescript
// Style A — class-level deps
@Service([UsersService])
@Controller("/users")
export class UsersController {
  constructor(private svc: UsersService) {}
}

// Style B — per-param @Inject
@Controller("/users")
export class UsersController {
  constructor(@Inject(UsersService) private svc: UsersService) {}
}
```

### `@Plugin` — Feature module

Composes services, controllers, sub-plugins, guards and hooks.

```typescript
import { Plugin } from "@byteholic/nelysia";

@Plugin({
  name:        "users",
  imports:     [OtherPlugin],          // sub-plugins (shared DI)
  services:    [UserRepo, UsersService],
  controllers: [UsersController],
  wsControllers: [UsersWsController],  // WebSocket controllers
  guard: {
    beforeHandle: requireAuth,         // applied to ALL routes
  },
  hooks: {
    onRequest: ({ request }) =>
      console.log(request.method, request.url),
    onError: ({ error }) =>
      console.error(error.message),
  },
})
export class UsersPlugin {}
```

Then in `main.ts`:

```typescript
new Elysia().use(buildPlugin(UsersPlugin)).listen(3000);
```

---

## HTTP Routes

```typescript
import { t } from "elysia";
import {
  Controller, Get, Post, Delete,
  Schema, BeforeHandle, Detail,
  Body, Path, Query, Set,
} from "@byteholic/nelysia";

const adminOnly = ({ headers, status }: any) => {
  if (headers["x-role"] !== "admin") return status(403);
};

@Controller("/users")
export class UsersController {
  constructor(@Inject(UsersService) private svc: UsersService) {}

  @Detail({ tags: ["Users"], summary: "List users" })
  @Schema({ query: t.Object({ page: t.Optional(t.Numeric({ default: 1 })) }) })
  @Get("/")
  getAll(@Query() query: { page?: number }) {
    return this.svc.all();
  }

  @Detail({ tags: ["Users"], summary: "Get user by id" })
  @Schema({ params: t.Object({ id: t.Numeric() }) })
  @Get("/:id")
  getOne(@Path("id") id: number, @Set() set: any) {
    const user = this.svc.byId(id);
    if (!user) { set.status = 404; return { error: "Not found" }; }
    return user;
  }

  @Detail({ tags: ["Users"], summary: "Create user" })
  @Schema({ body: t.Object({ name: t.String({ minLength: 1 }) }) })
  @Post("/")
  create(@Body() body: { name: string }, @Set() set: any) {
    set.status = 201;
    return this.svc.create(body);
  }

  @BeforeHandle(adminOnly)
  @Schema({ params: t.Object({ id: t.Numeric() }) })
  @Delete("/:id")
  remove(@Path("id") id: number) {
    return this.svc.remove(id);
  }
}
```

---

## WebSocket

```typescript
import { t } from "elysia";
import { WsController, Ws, WsSchema, WsHandlers, Inject } from "@byteholic/nelysia";

@WsController()
export class ChatWsController {
  constructor(@Inject(ChatService) private chat: ChatService) {}

  @WsSchema({
    body:   t.Object({ user: t.String(), text: t.String() }),
    params: t.Object({ room: t.String() }),
  })
  @Ws("/chat/:room")
  chat(): WsHandlers {
    const svc = this.chat;
    return {
      open(ws) {
        ws.subscribe(ws.data.params.room);
        ws.send("Welcome!");
      },
      message(ws, body) {
        const msg = svc.format(body.user, body.text, ws.data.params.room);
        svc.save(msg);
        ws.publish(ws.data.params.room, JSON.stringify(msg));
      },
      close(ws) {
        ws.unsubscribe(ws.data.params.room);
      },
    };
  }
}

// Register in @Plugin:
@Plugin({
  name:          "chat",
  services:      [ChatService],
  wsControllers: [ChatWsController],
})
export class ChatPlugin {}
```

Connect with:

```bash
bun add -g wscat
wscat -c "ws://localhost:3000/chat/general"
# send: {"user":"Alice","text":"Hello!"}
```

---

## Context Decorators

| Decorator | Extracts |
|---|---|
| `@Ctx()` | Full Elysia context |
| `@Body()` | `ctx.body` |
| `@Query()` | `ctx.query` (all) |
| `@Params()` | `ctx.params` (all) |
| `@Headers()` | `ctx.headers` |
| `@Cookie()` | `ctx.cookie` |
| `@Set()` | `ctx.set` (status/headers) |
| `@Path("id")` | `ctx.params.id` (single) |
| `@Q("page")` | `ctx.query.page` (single) |

---

## Lifecycle Hooks

Available in `hooks:` inside `@Plugin`:

| Hook | Fires when |
|---|---|
| `onRequest` | Every incoming request |
| `onParse` | Body parsing |
| `onTransform` | Before validation |
| `onBeforeHandle` | Before route handler |
| `onAfterHandle` | After route handler |
| `onAfterResponse` | After response is sent |
| `onError` | On any error |
| `mapResponse` | Transform response before send |

---

## Macro

Wraps Elysia's native `.macro()` API:

```typescript
import { Macro, MacroHandler } from "@byteholic/nelysia";

@Macro({ name: "auth" })
export class AuthMacro {
  @MacroHandler("roles")
  roles(required: string[]) {
    return {
      beforeHandle({ cookie, status }: any) {
        if (!required.includes(cookie.session?.value?.role))
          return status(403);
      },
    };
  }
}

// Register in @Plugin:
@Plugin({ macros: [AuthMacro], controllers: [AdminController] })
export class AdminPlugin {}
```

---

## Full Decorator Reference

### DI
| Decorator | Description |
|---|---|
| `@Service(deps?)` | Register class in DI container |
| `@Inject(Token)` | Per-parameter dependency injection |

### Plugin
| Decorator / Function | Description |
|---|---|
| `@Plugin(meta)` | Define a feature module |
| `buildPlugin(MyPlugin)` | Convert to native Elysia instance |

### HTTP
| Decorator | Description |
|---|---|
| `@Controller(prefix)` | HTTP controller class |
| `@Get / @Post / @Put / @Patch / @Delete / @Options / @Head / @All` | Route method |
| `@Schema({ body, query, params, headers, response })` | Elysia `t` validation |
| `@BeforeHandle(fn)` | Per-route guard / hook |
| `@AfterHandle(fn)` | Per-route after hook |
| `@OnError(fn)` | Per-route error handler |
| `@Detail({ tags, summary })` | OpenAPI metadata |

### WebSocket
| Decorator | Description |
|---|---|
| `@WsController(prefix?)` | WebSocket controller class |
| `@Ws(path?)` | WebSocket endpoint (returns `WsHandlers`) |
| `@WsSchema({ body, query, params })` | WS message validation |

---

## Project Structure

```
src/
  core/
    container.ts   — DI Container
    service.ts     — @Service, @Inject
    controller.ts  — @Controller, @Get, @Post, @Schema ...
    context.ts     — @Body, @Query, @Path, @Headers ...
    websocket.ts   — @WsController, @Ws, @WsSchema
    plugin.ts      — @Plugin, buildPlugin()
    macro.ts       — @Macro, @MacroHandler
  index.ts         — Public API barrel
```

---

## With Swagger

```bash
bun add @elysiajs/swagger
```

```typescript
import { swagger } from "@elysiajs/swagger";

new Elysia()
  .use(swagger({ documentation: { info: { title: "My API", version: "1.0.0" } } }))
  .use(buildPlugin(AppPlugin))
  .listen(3000);

// Docs at: http://localhost:3000/swagger
```

---

## Requirements

- [Bun](https://bun.sh) ≥ 1.0
- [ElysiaJS](https://elysiajs.com) ≥ 1.0
- `"experimentalDecorators": true` in `tsconfig.json`

---

## License

MIT © byteholic
