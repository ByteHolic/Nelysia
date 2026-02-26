import { t } from "elysia";
import { Controller, Inject, Post, Get, Schema, Detail, BeforeHandle, Body, Headers, Set } from "@byteholic/nelysia";
import { AuthService } from "./auth.service";

const requireBearer = ({ headers, status }: any) => {
  if (!headers.authorization?.startsWith("Bearer "))
    return status(401, { error: "Missing Authorization header" });
};


@Controller("/auth")
export class AuthController {
  constructor(@Inject(AuthService) private svc: AuthService) {}

  @Detail({ tags: ["Auth"], summary: "Login" })
  @Schema({ body: t.Object({ name: t.String({ minLength: 1 }) }) })
  @Post("/login")
  login(@Body() body: { name: string }, @Set() set: any) {
    const result = this.svc.login(body.name);
    if (!result.ok) set.status = 404;
    return result;
  }

  @Detail({ tags: ["Auth"], summary: "Get current user" })
  @BeforeHandle(requireBearer)
  @Schema({ headers: t.Object({ authorization: t.String() }) })
  @Get("/me")
  me(@Headers() headers: any, @Set() set: any) {
    const user = this.svc.validate(headers.authorization.slice(7));
    if (!user) { set.status = 401; return { error: "Invalid token" }; }
    return { user };
  }
}
