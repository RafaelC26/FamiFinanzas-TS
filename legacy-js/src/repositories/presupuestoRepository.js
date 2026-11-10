import { db } from '../db/database.js';

const SELECT = `SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color
  FROM presupuestos p JOIN categorias c ON c.id = p.categoria_id`;

const mapear = (p) =>
  p && {
    id: p.id,
    mes: p.mes,
    montoLimite: p.monto_limite,
    categoria: { id: p.categoria_id, nombre: p.categoria_nombre, color: p.categoria_color },
  };

export const presupuestoRepository = {
  crear(familiaId, { categoriaId, mes, montoLimite }) {
    const r = db.prepare('INSERT INTO presupuestos (familia_id, categoria_id, mes, monto_limite) VALUES (?, ?, ?, ?)')
      .run(familiaId, categoriaId, mes, montoLimite);
    return this.buscar(Number(r.lastInsertRowid), familiaId);
  },
  buscar(id, familiaId) {
    return mapear(db.prepare(`${SELECT} WHERE p.id = ? AND p.familia_id = ?`).get(id, familiaId));
  },
  buscarPorCategoriaMes(familiaId, categoriaId, mes) {
    return mapear(db.prepare(`${SELECT} WHERE p.familia_id = ? AND p.categoria_id = ? AND p.mes = ?`).get(familiaId, categoriaId, mes));
  },
  listarPorMes(familiaId, mes) {
    return db.prepare(`${SELECT} WHERE p.familia_id = ? AND p.mes = ? ORDER BY c.nombre`).all(familiaId, mes).map(mapear);
  },
  actualizar(id, familiaId, montoLimite) {
    db.prepare('UPDATE presupuestos SET monto_limite = ? WHERE id = ? AND familia_id = ?').run(montoLimite, id, familiaId);
    return this.buscar(id, familiaId);
  },
  eliminar(id, familiaId) {
    db.prepare('DELETE FROM presupuestos WHERE id = ? AND familia_id = ?').run(id, familiaId);
  },
};
