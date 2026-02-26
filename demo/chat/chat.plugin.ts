import { Plugin } from "@byteholic/nelysia";
import { ChatService } from "./chat.service";
import { ChatWsController } from "./chat.ws.controller";

@Plugin({
  name:          "chat",
  services:      [ChatService],
  wsControllers: [ChatWsController],
})
export class ChatPlugin {}
