import { Plugin } from "@byteholic/nelysia";
import { UsersPlugin } from "./users/users.plugin";
import { AuthPlugin }  from "./auth/auth.plugin";
import { ChatPlugin }  from "./chat/chat.plugin";

@Plugin({
  name: "app",
  imports: [UsersPlugin, AuthPlugin, ChatPlugin],
  hooks: {
    onRequest: ({ request }: any) =>
      console.log(`[Log] ${request.method} ${new URL(request.url).pathname}`),
    onError: ({ error, code }: any) =>
      console.error(`[ERROR] [${code}] ${error?.message}`),
  },
})
export class AppPlugin {}
