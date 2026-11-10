import { db } from '../db/database.js';

/** Convierte la fila a objeto de dominio. Nunca expone el hash salvo que se pida explícitamente. */
const mapear = (u, conHash = false) =>
  u && {
    id: u.id,
    familiaId: u.familia_id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: Boolean(u.activo),
    creadoEn: u.creado_en,
    ...(conHash ? { passwordHash: u.password_hash } : {}),
  };

export const usuarioRepository = {
  crear({ familiaId, nombre, email, passwordHash, rol }) {
    const r = db
      .prepare('INSERT INTO usuarios (familia_id, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)')
      .run(familiaId, nombre, email, passwordHash, rol);
    return this.buscarPorId(Number(r.lastInsertRowid));
  },
  buscarPorId(id) {
    return mapear(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id));
  },
  buscarPorIdConHash(id) {
    return mapear(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id), true);
  },
  buscarPorEmailConHash(email) {
    return mapear(db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email), true);
  },
  existeEmail(email) {
    return Boolean(db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email));
  },
  listarPorFamilia(familiaId) {
    return db.prepare('SELECT * FROM usuarios WHERE familia_id = ? ORDER BY activo DESC, nombre').all(familiaId).map((u) => mapear(u));
  },
  buscarEnFamilia(id, familiaId) {
    return mapear(db.prepare('SELECT * FROM usuarios WHERE id = ? AND familia_id = ?').get(id, familiaId));
  },
  contarAdminsActivos(familiaId) {
    return db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE familia_id = ? AND rol = 'ADMIN' AND activo = 1").get(familiaId).n;
  },
  actualizar(id, { nombre, rol, activo }) {
    db.prepare(
      `UPDATE usuarios SET nombre = COALESCE(?, nombre), rol = COALESCE(?, rol),
       activo = COALESCE(?, activo) WHERE id = ?`
    ).run(nombre ?? null, rol ?? null, activo === undefined ? null : Number(activo), id);
    return this.buscarPorId(id);
  },
  actualizarPassword(id, passwordHash) {
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  },
};
