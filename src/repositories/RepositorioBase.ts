import type { BaseDatos, ParametroSql } from '../db/database.js';

/** Resultado de un listado paginado antes de calcular las páginas. */
export interface ResultadoListado<T> {
  datos: T[];
  total: number;
  suma: number;
}

/** Resultado de un INSERT / UPDATE / DELETE. */
export interface ResultadoEscritura {
  idInsertado: number;
  cambios: number;
}

/** Condición WHERE con sus parámetros (siempre parametrizada, nunca concatenando valores). */
export interface ClausulaWhere {
  where: string;
  params: ParametroSql[];
}

/**
 * Clase base genérica de todos los repositorios (patrón Repository).
 *
 *  - TEntidad: la clase de dominio que devuelve (Gasto, Usuario, ...).
 *  - TFila:    la forma de la fila SQL (snake_case) que lee de SQLite.
 *
 * Centraliza el acceso a node:sqlite y obliga a cada subclase a implementar
 * `mapear()`, que convierte la fila en un objeto de dominio. En JS cada
 * repositorio repetía `db.prepare(...).get(...)` y su propio `mapear` sin tipos.
 */
export abstract class RepositorioBase<TEntidad, TFila extends object> {
  constructor(protected readonly bd: BaseDatos) {}

  protected abstract mapear(fila: TFila): TEntidad;

  protected fila<F extends object = TFila>(sql: string, ...params: ParametroSql[]): F | undefined {
    return this.bd.conexion.prepare(sql).get(...params) as F | undefined;
  }

  protected filas<F extends object = TFila>(sql: string, ...params: ParametroSql[]): F[] {
    return this.bd.conexion.prepare(sql).all(...params) as F[];
  }

  protected uno(sql: string, ...params: ParametroSql[]): TEntidad | null {
    const f = this.fila(sql, ...params);
    return f ? this.mapear(f) : null;
  }

  protected varios(sql: string, ...params: ParametroSql[]): TEntidad[] {
    return this.filas(sql, ...params).map((f) => this.mapear(f));
  }

  protected ejecutar(sql: string, ...params: ParametroSql[]): ResultadoEscritura {
    const r = this.bd.conexion.prepare(sql).run(...params);
    return { idInsertado: Number(r.lastInsertRowid), cambios: Number(r.changes) };
  }
}
