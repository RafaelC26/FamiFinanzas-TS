import type { ErrorApiDTO } from '../../src/shared/contratos.js';

/**
 * Unión discriminada: el resultado es un éxito con datos de tipo T o un error.
 * TypeScript obliga a revisar `ok` antes de usar `datos`, algo que en JS se
 * olvidaba fácilmente (y terminaba en "Cannot read properties of undefined").
 */
export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; status: number; error: ErrorApiDTO['error'] };

const errorDe = (status: number, codigo: string, mensaje: string): Resultado<never> => ({ ok: false, status, error: { codigo, mensaje } });

/** Cliente HTTP genérico para los endpoints JSON del servidor (usa la cookie de sesión). */
export class ClienteHttp {
  readonly #cache = new Map<string, Promise<Resultado<unknown>>>();

  constructor(private readonly base: string = '') {}

  /** GET tipado. `T` es el contrato (DTO) que se espera recibir. */
  obtener<T>(ruta: string, parametros: Record<string, string> = {}, usarCache = true): Promise<Resultado<T>> {
    const url = `${this.base}${ruta}?${new URLSearchParams(parametros).toString()}`;
    if (usarCache) {
      const previo = this.#cache.get(url);
      if (previo) return previo as Promise<Resultado<T>>;
    }
    const peticion = this.#pedir<T>(url);
    if (usarCache) this.#cache.set(url, peticion);
    return peticion;
  }

  /** Olvida las respuestas guardadas (p. ej. después de registrar un gasto). */
  limpiarCache(): void {
    this.#cache.clear();
  }

  async #pedir<T>(url: string): Promise<Resultado<T>> {
    try {
      const r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const esJson = r.headers.get('content-type')?.includes('application/json') ?? false;
      // Si la sesión expiró, el servidor redirige al login (HTML) en lugar de responder JSON.
      if (r.redirected || !esJson) return errorDe(401, 'SESION', 'La sesión expiró');
      const cuerpo: unknown = await r.json();
      if (!r.ok) return { ok: false, status: r.status, error: (cuerpo as ErrorApiDTO).error };
      return { ok: true, datos: cuerpo as T };
    } catch {
      return errorDe(0, 'RED', 'No hay conexión con el servidor');
    }
  }
}

/** Instancia compartida por todos los componentes. */
export const clienteHttp = new ClienteHttp();
