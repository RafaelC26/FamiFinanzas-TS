import { db } from '../db/database.js';

const SELECT = `
  SELECT g.*, c.nombre AS categoria_nombre, c.color AS categoria_color, u.nombre AS usuario_nombre
  FROM gastos g
  JOIN categorias c ON c.id = g.categoria_id
  JOIN usuarios u ON u.id = g.usuario_id`;

const mapear = (g) =>
  g && {
    id: g.id,
    monto: g.monto,
    fecha: g.fecha,
    descripcion: g.descripcion,
    metodoPago: g.metodo_pago,
    categoria: { id: g.categoria_id, nombre: g.categoria_nombre, color: g.categoria_color },
    usuario: { id: g.usuario_id, nombre: g.usuario_nombre },
    creadoEn: g.creado_en,
  };

/** Construye el WHERE común a listado, conteo y exportación (siempre aislado por familia). */
function filtros(familiaId, { desde, hasta, categoriaId, usuarioId }) {
  const cond = ['g.familia_id = ?'];
  const params = [familiaId];
  if (desde) { cond.push('g.fecha >= ?'); params.push(desde); }
  if (hasta) { cond.push('g.fecha <= ?'); params.push(hasta); }
  if (categoriaId) { cond.push('g.categoria_id = ?'); params.push(categoriaId); }
  if (usuarioId) { cond.push('g.usuario_id = ?'); params.push(usuarioId); }
  return { where: `WHERE ${cond.join(' AND ')}`, params };
}

export const gastoRepository = {
  crear(familiaId, usuarioId, { monto, fecha, categoriaId, descripcion, metodoPago }) {
    const r = db
      .prepare('INSERT INTO gastos (familia_id, usuario_id, categoria_id, monto, fecha, descripcion, metodo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(familiaId, usuarioId, categoriaId, monto, fecha, descripcion, metodoPago);
    return this.buscar(Number(r.lastInsertRowid), familiaId);
  },
  buscar(id, familiaId) {
    return mapear(db.prepare(`${SELECT} WHERE g.id = ? AND g.familia_id = ?`).get(id, familiaId));
  },
  listar(familiaId, f) {
    const { where, params } = filtros(familiaId, f);
    const total = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(monto), 0) AS suma FROM gastos g ${where}`).get(...params);
    const datos = db
      .prepare(`${SELECT} ${where} ORDER BY g.fecha DESC, g.id DESC LIMIT ? OFFSET ?`)
      .all(...params, f.limite, (f.pagina - 1) * f.limite)
      .map(mapear);
    return { datos, total: total.n, suma: total.suma };
  },
  listarTodos(familiaId, f) {
    const { where, params } = filtros(familiaId, f);
    return db.prepare(`${SELECT} ${where} ORDER BY g.fecha DESC, g.id DESC`).all(...params).map(mapear);
  },
  actualizar(id, familiaId, { monto, fecha, categoriaId, descripcion, metodoPago }) {
    db.prepare('UPDATE gastos SET monto = ?, fecha = ?, categoria_id = ?, descripcion = ?, metodo_pago = ? WHERE id = ? AND familia_id = ?')
      .run(monto, fecha, categoriaId, descripcion, metodoPago, id, familiaId);
    return this.buscar(id, familiaId);
  },
  eliminar(id, familiaId) {
    db.prepare('DELETE FROM gastos WHERE id = ? AND familia_id = ?').run(id, familiaId);
  },
  totalCategoriaMes(familiaId, categoriaId, mes) {
    return db
      .prepare("SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE familia_id = ? AND categoria_id = ? AND fecha BETWEEN ? AND ?")
      .get(familiaId, categoriaId, `${mes}-01`, `${mes}-31`).total;
  },
};
