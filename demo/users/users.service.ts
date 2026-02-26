import { Service } from "@byteholic/nelysia";

@Service()
export class UserRepo {
  private store = [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob",   role: "user"  },
    { id: 3, name: "Carol", role: "user"  },
  ];
  findAll()            { return this.store; }
  findById(id: number) { return this.store.find(u => u.id === id) ?? null; }
  create(data: { name: string; role?: string }) {
    const u = { id: this.store.length + 1, role: "user", ...data };
    this.store.push(u);
    return u;
  }
  delete(id: number) {
    const idx = this.store.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.store.splice(idx, 1);
    return true;
  }
}

@Service([UserRepo])
export class UsersService {
  constructor(private repo: UserRepo) {}
  all()              { return this.repo.findAll(); }
  byId(id: number)   { return this.repo.findById(id); }
  create(data: any)  { return this.repo.create(data); }
  remove(id: number) { return this.repo.delete(id); }
}
