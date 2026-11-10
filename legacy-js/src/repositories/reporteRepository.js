import { db } from '../db/database.js';

// Rango del mes como texto ('2026-10-01'..'2026-10-31'): permite usar el índice (familia_id, fecha).
const rango = (mes) => [`${mes}-01`, `${mes}-31`];

export const reporteRepository = {
  totales(familiaId, mes) {
    const g = db.prepare("SELECT COALESCE(SUM(monto),0) AS t, COUNT(*) AS n FROM gastos WHERE familia_id = ? AND fecha BETWEEN ? AND ?").get(familiaId, ...rango(mes));
    const i = db.prepare("SELECT COALESCE(SUM(monto),0) AS t FROM ingresos WHERE familia_id = ? AND fecha BETWEEN ? AND ?").get(familiaId, ...rango(mes));
    return { totalGastos: g.t, cantidadGastos: g.n, totalIngresos: i.t };
  },
  /** Gasto por categoría con su presupuesto del mes (incluye categorías con presupuesto y sin gastos). */
  porCategoria(familiaId, mes) {
    return db.prepare(`
      SELECT c.id, c.nombre, c.color,
        COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.categoria_id = c.id AND g.fecha BETWEEN ? AND ?), 0) AS total,
        p.monto_limite AS presupuesto
      FROM categorias c
      LEFT JOIN presupuestos p ON p.categoria_id = c.id AND p.mes = ?
      WHERE c.familia_id = ?
      ORDER BY total DESC, c.nombre`).all(...rango(mes), mes, familiaId)
      .filter((r) => r.total > 0 || r.presupuesto != null);
  },
  porMiembro(familiaId, mes) {
    return db.prepare(`
      SELECT u.id, u.nombre, COALESCE(SUM(g.monto), 0) AS total
      FROM usuarios u
      LEFT JOIN gastos g ON g.usuario_id = u.id AND g.fecha BETWEEN ? AND ?
      WHERE u.familia_id = ?
      GROUP BY u.id ORDER BY total DESC, u.nombre`).all(...rango(mes), familiaId);
  },
};
