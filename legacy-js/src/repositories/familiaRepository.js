import { db } from '../db/database.js';

const mapear = (f) => f && { id: f.id, nombre: f.nombre, moneda: f.moneda, creadoEn: f.creado_en };

export const familiaRepository = {
  crear({ nombre, moneda = 'COP' }) {
    const r = db.prepare('INSERT INTO familias (nombre, moneda) VALUES (?, ?)').run(nombre, moneda);
    return this.buscarPorId(Number(r.lastInsertRowid));
  },
  buscarPorId(id) {
    return mapear(db.prepare('SELECT * FROM familias WHERE id = ?').get(id));
  },
};
