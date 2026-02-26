import { Service } from "@byteholic/nelysia";
import { UsersService } from "../users/users.service";

@Service([UsersService])
export class AuthService {
  constructor(private users: UsersService) {}

  login(name: string) {
    const user = this.users.all().find(u => u.name === name);
    if (!user) return { ok: false, message: "User not found" };
    return { ok: true, token: `mock-jwt-for-${user.id}` };
  }

  validate(token: string) {
    const match = token.match(/^mock-jwt-for-(\d+)$/);
    if (!match) return null;
    return this.users.byId(Number(match[1]));
  }
}
