import { db } from '../db/database.js';

const mapear = (c) => c && { id: c.id, nombre: c.nombre, color: c.color, activo: Boolean(c.activo) };

export const categoriaRepository = {
  crear(familiaId, { nombre, color }) {
    const r = db.prepare('INSERT INTO categorias (familia_id, nombre, color) VALUES (?, ?, ?)').run(familiaId, nombre, color);
    return this.buscar(Number(r.lastInsertRowid), familiaId);
  },
  listar(familiaId, { incluirInactivas = false } = {}) {
    const sql = `SELECT * FROM categorias WHERE familia_id = ? ${incluirInactivas ? '' : 'AND activo = 1'} ORDER BY nombre`;
    return db.prepare(sql).all(familiaId).map(mapear);
  },
  buscar(id, familiaId) {
    return mapear(db.prepare('SELECT * FROM categorias WHERE id = ? AND familia_id = ?').get(id, familiaId));
  },
  buscarPorNombre(nombre, familiaId) {
    return mapear(db.prepare('SELECT * FROM categorias WHERE nombre = ? COLLATE NOCASE AND familia_id = ?').get(nombre, familiaId));
  },
  actualizar(id, familiaId, { nombre, color }) {
    db.prepare('UPDATE categorias SET nombre = ?, color = ?, activo = 1 WHERE id = ? AND familia_id = ?').run(nombre, color, id, familiaId);
    return this.buscar(id, familiaId);
  },
  tieneMovimientos(id) {
    return Boolean(db.prepare('SELECT 1 FROM gastos WHERE categoria_id = ? LIMIT 1').get(id));
  },
  desactivar(id) {
    db.prepare('UPDATE categorias SET activo = 0 WHERE id = ?').run(id);
  },
  eliminar(id) {
    db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
  },
};
