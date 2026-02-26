import 'reflect-metadata'; 
const CTX_PARAMS = Symbol("n:ctx-params");

export interface CtxParamMeta { index: number; extract: (ctx: any) => any; }

function makeParam(extract: (ctx: any) => any) {
  return (): ParameterDecorator => (target: any, key, index) => {
    const C = target.constructor;
    const map: Map<string | symbol, CtxParamMeta[]> =
      Reflect.getMetadata(CTX_PARAMS, C) ?? new Map();
    const list = map.get(key as string) ?? [];
    list.push({ index, extract });
    map.set(key as string, list);
    Reflect.defineMetadata(CTX_PARAMS, map, C);
  };
}

export function getCtxParams(t: any): Map<string | symbol, CtxParamMeta[]> {
  return Reflect.getMetadata(CTX_PARAMS, t) ?? new Map();
}

export const Ctx     = makeParam(c => c);
export const Body    = makeParam(c => c.body);
export const Query   = makeParam(c => c.query);
export const Params  = makeParam(c => c.params);
export const Headers = makeParam(c => c.headers);
export const Cookie  = makeParam(c => c.cookie);
export const Set     = makeParam(c => c.set);

/** @Path("id") → ctx.params.id */
export function Path(name: string): ParameterDecorator {
  return makeParam(c => c.params?.[name])();
}
/** @Q("page") → ctx.query.page */
export function Q(name: string): ParameterDecorator {
  return makeParam(c => c.query?.[name])();
}
