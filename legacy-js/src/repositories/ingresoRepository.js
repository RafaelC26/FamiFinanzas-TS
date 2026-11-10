import { db } from '../db/database.js';

const SELECT = `SELECT i.*, u.nombre AS usuario_nombre FROM ingresos i JOIN usuarios u ON u.id = i.usuario_id`;

const mapear = (i) =>
  i && {
    id: i.id,
    monto: i.monto,
    fecha: i.fecha,
    fuente: i.fuente,
    descripcion: i.descripcion,
    usuario: { id: i.usuario_id, nombre: i.usuario_nombre },
    creadoEn: i.creado_en,
  };

function filtros(familiaId, { desde, hasta, usuarioId }) {
  const cond = ['i.familia_id = ?'];
  const params = [familiaId];
  if (desde) { cond.push('i.fecha >= ?'); params.push(desde); }
  if (hasta) { cond.push('i.fecha <= ?'); params.push(hasta); }
  if (usuarioId) { cond.push('i.usuario_id = ?'); params.push(usuarioId); }
  return { where: `WHERE ${cond.join(' AND ')}`, params };
}

export const ingresoRepository = {
  crear(familiaId, usuarioId, { monto, fecha, fuente, descripcion }) {
    const r = db
      .prepare('INSERT INTO ingresos (familia_id, usuario_id, monto, fecha, fuente, descripcion) VALUES (?, ?, ?, ?, ?, ?)')
      .run(familiaId, usuarioId, monto, fecha, fuente, descripcion);
    return this.buscar(Number(r.lastInsertRowid), familiaId);
  },
  buscar(id, familiaId) {
    return mapear(db.prepare(`${SELECT} WHERE i.id = ? AND i.familia_id = ?`).get(id, familiaId));
  },
  listar(familiaId, f) {
    const { where, params } = filtros(familiaId, f);
    const total = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(monto), 0) AS suma FROM ingresos i ${where}`).get(...params);
    const datos = db
      .prepare(`${SELECT} ${where} ORDER BY i.fecha DESC, i.id DESC LIMIT ? OFFSET ?`)
      .all(...params, f.limite, (f.pagina - 1) * f.limite)
      .map(mapear);
    return { datos, total: total.n, suma: total.suma };
  },
  actualizar(id, familiaId, { monto, fecha, fuente, descripcion }) {
    db.prepare('UPDATE ingresos SET monto = ?, fecha = ?, fuente = ?, descripcion = ? WHERE id = ? AND familia_id = ?')
      .run(monto, fecha, fuente, descripcion, id, familiaId);
    return this.buscar(id, familiaId);
  },
  eliminar(id, familiaId) {
    db.prepare('DELETE FROM ingresos WHERE id = ? AND familia_id = ?').run(id, familiaId);
  },
};
