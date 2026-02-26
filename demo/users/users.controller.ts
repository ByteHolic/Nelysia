import { t } from "elysia";
import {
  Controller, Get, Post, Delete,
  Schema, Detail, BeforeHandle,
  Body, Query, Path, Set,
  Inject,
} from "@byteholic/nelysia";
import { UsersService } from "./users.service";

const adminOnly = ({ headers, status }: any) => {
  if (headers["x-role"] !== "admin") return status(403);
};

@Controller("/users")
export class UsersController {
  constructor(@Inject(UsersService) private svc: UsersService) {}

  @Detail({ tags: ["Users"], summary: "List all users" })
  @Schema({ query: t.Object({ page: t.Optional(t.Numeric({ default: 1 })) }) })
  @Get("/")
  getAll(@Query() query: { page?: number }) {
    const all = this.svc.all(), page = query.page ?? 1;
    return { data: all.slice((page - 1) * 10, page * 10), total: all.length, page };
  }

  @Detail({ tags: ["Users"], summary: "Get user by ID" })
  @Schema({ params: t.Object({ id: t.Numeric() }) })
  @Get("/:id")
  getOne(@Path("id") id: number, @Set() set: any) {
    const user = this.svc.byId(id);
    if (!user) { set.status = 404; return { error: "Not found" }; }
    return user;
  }

  @Detail({ tags: ["Users"], summary: "Create user" })
  @Schema({
    body: t.Object({
      name: t.String({ minLength: 1 }),
      role: t.Optional(t.Union([t.Literal("admin"), t.Literal("user")])),
    }),
  })
  @Post("/")
  create(@Body() body: { name: string; role?: string }, @Set() set: any) {
    set.status = 201;
    return this.svc.create(body);
  }

  @Detail({ tags: ["Users"], summary: "Delete user (admin only)" })
  @BeforeHandle(adminOnly)
  @Schema({ params: t.Object({ id: t.Numeric() }) })
  @Delete("/:id")
  remove(@Path("id") id: number, @Set() set: any) {
    const ok = this.svc.remove(id);
    if (!ok) { set.status = 404; return { error: "Not found" }; }
    set.status = 204;
    return null;
  }
}
