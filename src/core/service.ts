import 'reflect-metadata'; 
import { serviceRegistry } from "./container";

// ── Class decorator

/**
 * @Service(deps?)
 * Register a class in Nelysia's DI container.
 * Pass constructor dependencies as an explicit array.
 *
 * @example
 * @Service([UserRepo])
 * export class UsersService {
 *   constructor(private repo: UserRepo) {}
 * }
 */
export function Service(deps: any[] = []): ClassDecorator {
  return (target: any) => {
    serviceRegistry.set(target, { deps });
  };
}

// ── Parameter decorator

const INJECT_PARAMS = Symbol("n:inject:params");

/**
 * @Inject(Token)
 * Declare a constructor parameter dependency explicitly.
 * Use this instead of (or alongside) @Service([...deps]).
 *
 * @example
 * @Controller("/auth")
 * export class AuthController {
 *   constructor(@Inject(AuthService) private svc: AuthService) {}
 * }
 *
 * // Multiple params
 * @Controller("/users")
 * export class UsersController {
 *   constructor(
 *     @Inject(UserRepo)   private repo:   UserRepo,
 *     @Inject(LogService) private logger: LogService,
 *   ) {}
 * }
 */
export function Inject(token: any): ParameterDecorator {
  return (target: any, _key, index) => {
    const Ctor = typeof target === "function" ? target : target.constructor;
    const map: Map<number, any> =
      Reflect.getMetadata(INJECT_PARAMS, Ctor) ?? new Map();
    map.set(index, token);
    Reflect.defineMetadata(INJECT_PARAMS, map, Ctor);
  };
}

/**
 * Read all @Inject(Token) metadata from a constructor.
 * Returns a Map of { paramIndex → token }.
 */
export function getInjectParams(Ctor: any): Map<number, any> {
  return Reflect.getMetadata(INJECT_PARAMS, Ctor) ?? new Map();
}
