import { t } from "elysia";
import { WsController, Ws, WsSchema, WsHandlers, Inject } from "@byteholic/nelysia";
import { ChatService } from "./chat.service";

@WsController()
export class ChatWsController {
  constructor(@Inject(ChatService) private chatSvc: ChatService) {}

  @WsSchema({
    body:   t.Object({ user: t.String({ minLength: 1 }), text: t.String({ minLength: 1 }) }),
    query:  t.Object({ token: t.Optional(t.String()) }),
    params: t.Object({ room: t.String({ minLength: 1 }) }),
  })
  @Ws("/chat/:room")
  chat(): WsHandlers {
    const chatSvc = this.chat;

    return {
      open(ws) {
        const room: string = ws.data.params.room;
        ws.subscribe(room);
        const history = chatSvc.getHistory(room);
        if (history.length)
          ws.send(JSON.stringify({ type: "history", messages: history }));
        ws.publish(room, JSON.stringify({
          type: "system", text: `A user joined #${room}`,
          sentAt: new Date().toISOString(),
        }));
      },

      message(ws, body) {
        const room: string = ws.data.params.room;
        const msg = chatSvc.format(body.user, body.text, room);
        chatSvc.save(msg);
        ws.publish(room, JSON.stringify({ type: "message", ...msg }));
      },

      close(ws) {
        const room: string = ws.data.params.room;
        ws.unsubscribe(room);
        ws.publish(room, JSON.stringify({
          type: "system", text: `A user left #${room}`,
          sentAt: new Date().toISOString(),
        }));
      },
    };
  }
}
