import 'reflect-metadata'; 

export interface WsHandlers<TMsg = any> {
  open?:    (ws: any) => void | Promise<void>;
  message?: (ws: any, message: TMsg) => void | Promise<void>;
  close?:   (ws: any, code: number, reason: string) => void | Promise<void>;
  drain?:   (ws: any) => void | Promise<void>;
}

export interface WsRouteDefinition {
  path: string; key: string | symbol; schema?: Record<string, any>;
}

const WS_PREFIX = Symbol("n:ws:prefix");
const WS_ROUTES = Symbol("n:ws:routes");
const WS_SCHEMA = Symbol("n:ws:schema");

/** @WsController(prefix?) — mark a class as a WebSocket controller */
export function WsController(prefix = ""): ClassDecorator {
  return (t: any) => Reflect.defineMetadata(WS_PREFIX, prefix, t);
}
export function getWsPrefix(t: any): string {
  return Reflect.getMetadata(WS_PREFIX, t) ?? "";
}
export function getWsRoutes(t: any): WsRouteDefinition[] {
  return Reflect.getMetadata(WS_ROUTES, t) ?? [];
}

/**
 * @Ws(path?) — define a WebSocket endpoint.
 * The decorated method MUST return a WsHandlers object.
 */
export function Ws(path = ""): MethodDecorator {
  return (target: any, key, descriptor) => {
    const C = target.constructor;
    const routes: WsRouteDefinition[] = Reflect.getMetadata(WS_ROUTES, C) ?? [];
    routes.push({ path, key: key as string, schema: Reflect.getMetadata(WS_SCHEMA, C, key) });
    Reflect.defineMetadata(WS_ROUTES, routes, C);
    return descriptor;
  };
}

/**
 * @WsSchema({...}) — attach validation to a WS route.
 * Place ABOVE @Ws decorator.
 */
export function WsSchema(schema: Record<string, any>): MethodDecorator {
  return (t: any, k) => Reflect.defineMetadata(WS_SCHEMA, schema, t.constructor, k);
}
