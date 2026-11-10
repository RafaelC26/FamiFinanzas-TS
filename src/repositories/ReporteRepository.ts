import type { BaseDatos, ParametroSql } from '../db/database.js';
import type { TotalCategoriaCrudo } from '../dominio/ResumenMensual.js';
import type { TotalMiembroDTO } from '../shared/contratos.js';

export interface TotalesMes {
  totalGastos: number;
  cantidadGastos: number;
  totalIngresos: number;
}

/** Tupla tipada: [primer día, último día] del mes. */
type RangoMes = [desde: string, hasta: string];

// Rango del mes como texto ('2026-10-01'..'2026-10-31'): permite usar el índice (familia_id, fecha).
const rango = (mes: string): RangoMes => [`${mes}-01`, `${mes}-31`];

/** Consultas de agregación (no devuelve entidades, por eso no hereda de RepositorioBase). */
export class ReporteRepository {
  constructor(private readonly bd: BaseDatos) {}

  private uno<T>(sql: string, ...params: ParametroSql[]): T {
    return this.bd.conexion.prepare(sql).get(...params) as T;
  }

  private todos<T>(sql: string, ...params: ParametroSql[]): T[] {
    return this.bd.conexion.prepare(sql).all(...params) as T[];
  }

  totales(familiaId: number, mes: string): TotalesMes {
    const g = this.uno<{ t: number; n: number }>(
      'SELECT COALESCE(SUM(monto),0) AS t, COUNT(*) AS n FROM gastos WHERE familia_id = ? AND fecha BETWEEN ? AND ?', familiaId, ...rango(mes),
    );
    const i = this.uno<{ t: number }>(
      'SELECT COALESCE(SUM(monto),0) AS t FROM ingresos WHERE familia_id = ? AND fecha BETWEEN ? AND ?', familiaId, ...rango(mes),
    );
    return { totalGastos: g.t, cantidadGastos: g.n, totalIngresos: i.t };
  }

  /** Gasto por categoría con su presupuesto del mes (incluye categorías con presupuesto y sin gastos). */
  porCategoria(familiaId: number, mes: string): TotalCategoriaCrudo[] {
    return this.todos<TotalCategoriaCrudo>(`
      SELECT c.id, c.nombre, c.color,
        COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.categoria_id = c.id AND g.fecha BETWEEN ? AND ?), 0) AS total,
        p.monto_limite AS presupuesto
      FROM categorias c
      LEFT JOIN presupuestos p ON p.categoria_id = c.id AND p.mes = ?
      WHERE c.familia_id = ?
      ORDER BY total DESC, c.nombre`, ...rango(mes), mes, familiaId)
      .filter((r) => r.total > 0 || r.presupuesto != null);
  }

  porMiembro(familiaId: number, mes: string): TotalMiembroDTO[] {
    return this.todos<{ id: number; nombre: string; total: number }>(`
      SELECT u.id, u.nombre, COALESCE(SUM(g.monto), 0) AS total
      FROM usuarios u
      LEFT JOIN gastos g ON g.usuario_id = u.id AND g.fecha BETWEEN ? AND ?
      WHERE u.familia_id = ?
      GROUP BY u.id ORDER BY total DESC, u.nombre`, ...rango(mes), familiaId)
      .map((m) => ({ usuarioId: m.id, nombre: m.nombre, total: m.total }));
  }
}
