import { Plugin } from "@byteholic/nelysia";
import { UserRepo, UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Plugin({
  name:        "users",
  services:    [UserRepo, UsersService],
  controllers: [UsersController],
})
export class UsersPlugin {}
