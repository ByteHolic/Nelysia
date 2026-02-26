import { Service } from "@byteholic/nelysia";

export interface ChatMessage {
  user: string; text: string; room: string; sentAt: string;
}

@Service()
export class ChatService {
  private history = new Map<string, ChatMessage[]>();

  save(msg: ChatMessage) {
    const msgs = this.history.get(msg.room) ?? [];
    msgs.push(msg);
    this.history.set(msg.room, msgs.slice(-100));
  }

  getHistory(room: string): ChatMessage[] {
    return this.history.get(room) ?? [];
  }

  format(user: string, text: string, room: string): ChatMessage {
    return { user, text, room, sentAt: new Date().toISOString() };
  }
}
