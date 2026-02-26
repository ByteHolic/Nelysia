import { Plugin } from "@byteholic/nelysia";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersPlugin } from "../users/users.plugin";

@Plugin({
  name:        "auth",
  imports:     [UsersPlugin],
  services:    [AuthService],
  controllers: [AuthController],
})
export class AuthPlugin {}
