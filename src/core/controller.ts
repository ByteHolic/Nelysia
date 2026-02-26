import 'reflect-metadata'; 

/**
 * DECORATOR ORDER — place above the HTTP verb, reads bottom to top:
 *
 * @Detail({ tags: ["Users"] })     ← OpenAPI
 * @Schema({ body: t.Object() })    ← validation
 * @BeforeHandle(authFn)            ← per-route hook
 * @Post("/")                       ← defines the route  ← LAST
 * myMethod() { ... }
 */

export type HttpVerb =
  | "GET" | "POST" | "PUT" | "PATCH"
  | "DELETE" | "OPTIONS" | "HEAD" | "ALL";

export interface RouteSchema {
  body?: any; query?: any; params?: any; headers?: any; response?: any;
}

export interface RouteDefinition {
  verb: HttpVerb; path: string; key: string | symbol;
  schema?: RouteSchema;
  beforeHandle?: Function | Function[];
  afterHandle?:  Function | Function[];
  onError?:      Function | Function[];
  detail?:       Record<string, any>;
}

const PREFIX = Symbol("n:prefix");
const ROUTES = Symbol("n:routes");
const SCHEMA = Symbol("n:schema");
const BEFORE = Symbol("n:before");
const AFTER  = Symbol("n:after");
const ERROR  = Symbol("n:error");

export function Controller(prefix = ""): ClassDecorator {
  return (t: any) => Reflect.defineMetadata(PREFIX, prefix, t);
}
export function getControllerPrefix(t: any): string {
  return Reflect.getMetadata(PREFIX, t) ?? "";
}
export function getRoutes(t: any): RouteDefinition[] {
  return Reflect.getMetadata(ROUTES, t) ?? [];
}

function defineRoute(verb: HttpVerb) {
  return (path = ""): MethodDecorator =>
    (target: any, key, descriptor) => {
      const C = target.constructor;
      const routes: RouteDefinition[] = Reflect.getMetadata(ROUTES, C) ?? [];
      routes.push({
        verb, path, key: key as string,
        schema:       Reflect.getMetadata(SCHEMA, C, key),
        beforeHandle: Reflect.getMetadata(BEFORE, C, key),
        afterHandle:  Reflect.getMetadata(AFTER,  C, key),
        onError:      Reflect.getMetadata(ERROR,  C, key),
      });
      Reflect.defineMetadata(ROUTES, routes, C);
      return descriptor;
    };
}

export const Get     = defineRoute("GET");
export const Post    = defineRoute("POST");
export const Put     = defineRoute("PUT");
export const Patch   = defineRoute("PATCH");
export const Delete  = defineRoute("DELETE");
export const Options = defineRoute("OPTIONS");
export const Head    = defineRoute("HEAD");
export const All     = defineRoute("ALL");

export function Schema(schema: RouteSchema): MethodDecorator {
  return (t: any, k) => Reflect.defineMetadata(SCHEMA, schema, t.constructor, k);
}
export function BeforeHandle(fn: Function | Function[]): MethodDecorator {
  return (t: any, k) => Reflect.defineMetadata(BEFORE, fn, t.constructor, k);
}
export function AfterHandle(fn: Function | Function[]): MethodDecorator {
  return (t: any, k) => Reflect.defineMetadata(AFTER, fn, t.constructor, k);
}
export function OnError(fn: Function): MethodDecorator {
  return (t: any, k) => Reflect.defineMetadata(ERROR, fn, t.constructor, k);
}
export function Detail(detail: Record<string, any>): MethodDecorator {
  return (t: any, k) => {
    const routes: RouteDefinition[] = Reflect.getMetadata(ROUTES, t.constructor) ?? [];
    const found = routes.find(r => r.key === k);
    if (found) found.detail = detail;
    Reflect.defineMetadata(ROUTES, routes, t.constructor);
  };
}
