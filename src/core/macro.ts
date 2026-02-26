import { Elysia } from "elysia";
import 'reflect-metadata'; 

const MACRO_META    = Symbol("n:macro");
const MACRO_HANDLER = Symbol("n:macro:handler");

/** @Macro({ name }) — mark a class as an Elysia macro plugin */
export function Macro(meta: { name: string }): ClassDecorator {
  return (t: any) => Reflect.defineMetadata(MACRO_META, meta, t);
}

/** @MacroHandler(field) — handle a specific macro option key */
export function MacroHandler(field: string): MethodDecorator {
  return (target: any, key, descriptor) => {
    const C = target.constructor;
    const map: Map<string, string | symbol> =
      Reflect.getMetadata(MACRO_HANDLER, C) ?? new Map();
    map.set(field, key);
    Reflect.defineMetadata(MACRO_HANDLER, map, C);
    return descriptor;
  };
}

/** Convert a @Macro class into a native Elysia macro plugin */
export function buildMacroPlugin(MacroClass: any): Elysia {
  const meta = Reflect.getMetadata(MACRO_META, MacroClass);
  if (!meta)
    throw new Error(`[Nelysia] ${MacroClass.name} must use @Macro({ name: "..." })`);

  const instance = new MacroClass();
  const handlers: Map<string, string | symbol> =
    Reflect.getMetadata(MACRO_HANDLER, MacroClass) ?? new Map();

  const def: Record<string, any> = {};
  for (const [field, k] of handlers)
    def[field] = (v: any) => (instance as any)[k as string](v);

  return new Elysia({ name: meta.name }).macro(def);
}
