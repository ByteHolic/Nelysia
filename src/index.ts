/**
 * Nelysia — Native Elysia Modular Framework
 */

// ── DI
export { Container, serviceRegistry }       from "./core/container";
export type { ServiceProvider, Factory }    from "./core/container";
export { Service, Inject, getInjectParams } from "./core/service";

// ── Plugin
export { Plugin, buildPlugin, getPluginMeta } from "./core/plugin";
export type { PluginMeta }                     from "./core/plugin";

// ── HTTP Controller & Route decorators
export {
  Controller,
  Get, Post, Put, Patch, Delete, Options, Head, All,
  Schema, BeforeHandle, AfterHandle, OnError, Detail,
  getControllerPrefix, getRoutes,
} from "./core/controller";
export type { HttpVerb, RouteSchema, RouteDefinition } from "./core/controller";

// ── WebSocket decorators
export {
  WsController, Ws, WsSchema,
  getWsPrefix, getWsRoutes,
} from "./core/websocket";
export type { WsHandlers, WsRouteDefinition } from "./core/websocket";

// ── Context parameter decorators
export {
  Ctx, Body, Query, Params, Headers, Cookie, Set, Path, Q,
  getCtxParams,
} from "./core/context";
export type { CtxParamMeta } from "./core/context";

// ── Macro
export { Macro, MacroHandler, buildMacroPlugin } from "./core/macro";

