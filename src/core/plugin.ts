import "reflect-metadata";
import { Elysia } from "elysia";
import { Container, serviceRegistry } from "./container";
import { getInjectParams } from "./service";
import { getControllerPrefix, getRoutes } from "./controller";
import { getCtxParams } from "./context";
import { getWsPrefix, getWsRoutes } from "./websocket";
import { buildMacroPlugin } from "./macro";

const PLUGIN_META = Symbol("n:plugin");

export interface PluginMeta {
  imports?:       any[];
  controllers?:   any[];
  wsControllers?: any[];
  services?:      (new (...args: any[]) => any)[];
  macros?:        any[];
  prefix?:        string;
  name?:          string;
  scoped?:        boolean;
  guard?: {
    beforeHandle?: Function | Function[];
    afterHandle?:  Function | Function[];
  };
  hooks?: {
    onRequest?:       Function | Function[];
    onParse?:         Function | Function[];
    onTransform?:     Function | Function[];
    onBeforeHandle?:  Function | Function[];
    onAfterHandle?:   Function | Function[];
    onAfterResponse?: Function | Function[];
    onError?:         Function | Function[];
    mapResponse?:     Function | Function[];
  };
}

export function Plugin(meta: PluginMeta): ClassDecorator {
  return (target: any) => Reflect.defineMetadata(PLUGIN_META, meta, target);
}

export function getPluginMeta(target: any): PluginMeta {
  return Reflect.getMetadata(PLUGIN_META, target) ?? {};
}

const pluginCache = new Map<any, Elysia>();

/** Build deps array — prefers @Service([]) then falls back to @Inject params */
function resolveDeps(Cls: any): any[] {
  const svcMeta  = serviceRegistry.get(Cls);
  const injected = getInjectParams(Cls);

  if (svcMeta?.deps && svcMeta.deps.length > 0) return svcMeta.deps;

  if (injected.size > 0) {
    const maxIdx = Math.max(...injected.keys());
    const deps   = new Array(maxIdx + 1).fill(null);
    for (const [i, token] of injected) deps[i] = token;
    return deps;
  }

  return [];
}

export function buildPlugin(PluginClass: any, parentContainer?: Container): Elysia {
  if (pluginCache.has(PluginClass)) return pluginCache.get(PluginClass)!;

  const meta      = getPluginMeta(PluginClass);
  const container = new Container(parentContainer);

  // ── 1. Register services
  for (const Svc of meta.services ?? []) {
    container.register([{
      token: Svc, useClass: Svc,
      deps:  resolveDeps(Svc),
      scope: "singleton",
    }]);
  }

  // ── 2. Register HTTP controllers in DI
  for (const Ctrl of meta.controllers ?? []) {
    container.register([{
      token: Ctrl, useClass: Ctrl,
      deps:  resolveDeps(Ctrl),
      scope: "singleton",
    }]);
  }

  // ── 3. Register WS controllers in DI
  for (const WsCtrl of meta.wsControllers ?? []) {
    container.register([{
      token: WsCtrl, useClass: WsCtrl,
      deps:  resolveDeps(WsCtrl),
      scope: "singleton",
    }]);
  }

  // ── 4. Build Elysia instance
  const opts: Record<string, any> = {};
  if (meta.name)           opts.name   = meta.name;
  if (meta.scoped != null) opts.scoped = meta.scoped;
  if (meta.prefix)         opts.prefix = meta.prefix;

  let app: any = new Elysia(opts);

  // ── 5. Attach lifecycle hooks
  const toArr = (v?: Function | Function[]) =>
    !v ? [] : Array.isArray(v) ? v : [v];

  const h = meta.hooks ?? {};
  for (const fn of toArr(h.onRequest))       app = app.onRequest(fn);
  for (const fn of toArr(h.onParse))         app = app.onParse(fn);
  for (const fn of toArr(h.onTransform))     app = app.onTransform(fn);
  for (const fn of toArr(h.onBeforeHandle))  app = app.onBeforeHandle(fn);
  for (const fn of toArr(h.onAfterHandle))   app = app.onAfterHandle(fn);
  for (const fn of toArr(h.onAfterResponse)) app = app.onAfterResponse(fn);
  for (const fn of toArr(h.onError))         app = app.onError(fn);
  for (const fn of toArr(h.mapResponse))     app = app.mapResponse(fn);

  // ── 6. Mount macros
  for (const MacroClass of meta.macros ?? [])
    app = app.use(buildMacroPlugin(MacroClass));

  // ── 7. Mount sub-plugins
  for (const Sub of meta.imports ?? [])
    app = app.use(buildPlugin(Sub, container));

  // ── 8. Mount HTTP controllers
  for (const Ctrl of meta.controllers ?? [])
    app = mountHttpController(app, Ctrl, container, meta.guard);

  // ── 9. Mount WS controllers 
  for (const WsCtrl of meta.wsControllers ?? [])
    app = mountWsController(app, WsCtrl, container);

  pluginCache.set(PluginClass, app);
  return app as Elysia;
}

function mountHttpController(
  app: any, Ctrl: any, container: Container, guard?: PluginMeta["guard"],
): any {
  const instance = container.resolve(Ctrl);
  const prefix   = getControllerPrefix(Ctrl);
  const routes   = getRoutes(Ctrl);
  const ctxMap   = getCtxParams(Ctrl);

  const registerRoutes = (e: any): any => {
    for (const route of routes) {
      const fullPath = `${prefix}${route.path}` || "/";
      const verb     = route.verb.toLowerCase();

      const handler = (ctx: any) => {
        const list = ctxMap.get(route.key as string) ?? [];
        if (!list.length) return (instance as any)[route.key as string](ctx);
        const maxIdx = Math.max(...list.map((p: any) => p.index));
        const args   = new Array(maxIdx + 1);
        for (const p of list) args[p.index] = p.extract(ctx);
        return (instance as any)[route.key as string](...args);
      };

      const routeOpts: Record<string, any> = {};
      if (route.schema)       Object.assign(routeOpts, route.schema);
      if (route.beforeHandle) routeOpts.beforeHandle = route.beforeHandle;
      if (route.afterHandle)  routeOpts.afterHandle  = route.afterHandle;
      if (route.onError)      routeOpts.error        = route.onError;
      if (route.detail)       routeOpts.detail       = route.detail;

      verb === "all"
        ? e.all(fullPath, handler, routeOpts)
        : e[verb](fullPath, handler, routeOpts);
    }
    return e;
  };

  if (guard?.beforeHandle || guard?.afterHandle) {
    const gc: Record<string, any> = {};
    if (guard.beforeHandle) gc.beforeHandle = guard.beforeHandle;
    if (guard.afterHandle)  gc.afterHandle  = guard.afterHandle;
    return app.guard(gc, (inner: any) => registerRoutes(inner));
  }
  return registerRoutes(app);
}

function mountWsController(app: any, WsCtrl: any, container: Container): any {
  const instance = container.resolve(WsCtrl);
  const prefix   = getWsPrefix(WsCtrl);
  const routes   = getWsRoutes(WsCtrl);

  for (const route of routes) {
    const fullPath = `${prefix}${route.path}` || "/";
    const handlers = (instance as any)[route.key as string]();

    const wsOpts: Record<string, any> = { ...(route.schema ?? {}) };
    if (handlers.open)    wsOpts.open    = handlers.open.bind(instance);
    if (handlers.message) wsOpts.message = handlers.message.bind(instance);
    if (handlers.close)   wsOpts.close   = handlers.close.bind(instance);
    if (handlers.drain)   wsOpts.drain   = handlers.drain.bind(instance);

    app = app.ws(fullPath, wsOpts);
  }
  return app;
}
