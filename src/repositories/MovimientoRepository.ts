import { RepositorioBase, type ClausulaWhere, type ResultadoListado } from './RepositorioBase.js';
import type { Movimiento } from '../dominio/Movimiento.js';
import type { ParametroSql } from '../db/database.js';
import type { FiltroMovimientos } from '../utils/validacion.js';

/** Filtros sin la paginación (para exportar todo lo filtrado). */
export type CriteriosMovimiento = Omit<FiltroMovimientos, 'pagina' | 'limite'>;

/**
 * Repositorio abstracto para gastos e ingresos: comparten filtros por fecha y
 * miembro, paginación, suma y aislamiento por familia. Las subclases solo
 * declaran su tabla, su alias y su SELECT; la lógica común se hereda.
 */
export abstract class MovimientoRepository<T extends Movimiento, TFila extends object> extends RepositorioBase<T, TFila> {
  protected abstract readonly tabla: 'gastos' | 'ingresos';
  protected abstract readonly alias: 'g' | 'i';
  protected abstract readonly select: string;

  /** Hook para que cada subclase agregue filtros propios (p. ej. categoría en gastos). */
  protected filtrosAdicionales(_criterios: CriteriosMovimiento): ClausulaWhere {
    return { where: '', params: [] };
  }

  /** WHERE común a listado, conteo y exportación (siempre aislado por familia). */
  protected filtros(familiaId: number, criterios: CriteriosMovimiento): ClausulaWhere {
    const a = this.alias;
    const cond: string[] = [`${a}.familia_id = ?`];
    const params: ParametroSql[] = [familiaId];
    if (criterios.desde) { cond.push(`${a}.fecha >= ?`); params.push(criterios.desde); }
    if (criterios.hasta) { cond.push(`${a}.fecha <= ?`); params.push(criterios.hasta); }
    if (criterios.usuarioId) { cond.push(`${a}.usuario_id = ?`); params.push(criterios.usuarioId); }
    const extra = this.filtrosAdicionales(criterios);
    if (extra.where) { cond.push(extra.where); params.push(...extra.params); }
    return { where: `WHERE ${cond.join(' AND ')}`, params };
  }

  buscar(id: number, familiaId: number): T | null {
    return this.uno(`${this.select} WHERE ${this.alias}.id = ? AND ${this.alias}.familia_id = ?`, id, familiaId);
  }

  listar(familiaId: number, f: FiltroMovimientos): ResultadoListado<T> {
    const { where, params } = this.filtros(familiaId, f);
    const total = this.fila<{ n: number; suma: number }>(
      `SELECT COUNT(*) AS n, COALESCE(SUM(monto), 0) AS suma FROM ${this.tabla} ${this.alias} ${where}`, ...params,
    ) ?? { n: 0, suma: 0 };
    const datos = this.varios(
      `${this.select} ${where} ORDER BY ${this.alias}.fecha DESC, ${this.alias}.id DESC LIMIT ? OFFSET ?`,
      ...params, f.limite, (f.pagina - 1) * f.limite,
    );
    return { datos, total: total.n, suma: total.suma };
  }

  listarTodos(familiaId: number, criterios: CriteriosMovimiento): T[] {
    const { where, params } = this.filtros(familiaId, criterios);
    return this.varios(`${this.select} ${where} ORDER BY ${this.alias}.fecha DESC, ${this.alias}.id DESC`, ...params);
  }

  eliminar(id: number, familiaId: number): void {
    this.ejecutar(`DELETE FROM ${this.tabla} WHERE id = ? AND familia_id = ?`, id, familiaId);
  }
}
