import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

const ESQUEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS familias (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL,
  moneda     TEXT    NOT NULL DEFAULT 'COP',
  creado_en  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  familia_id     INTEGER NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  nombre         TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT    NOT NULL,
  rol            TEXT    NOT NULL CHECK (rol IN ('ADMIN', 'MIEMBRO')),
  activo         INTEGER NOT NULL DEFAULT 1,
  creado_en      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  familia_id  INTEGER NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  nombre      TEXT    NOT NULL,
  color       TEXT    NOT NULL DEFAULT '#4f46e5',
  activo      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (familia_id, nombre)
);

CREATE TABLE IF NOT EXISTS gastos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  familia_id    INTEGER NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id),
  monto         REAL    NOT NULL CHECK (monto > 0),
  fecha         TEXT    NOT NULL,
  descripcion   TEXT    NOT NULL DEFAULT '',
  metodo_pago   TEXT    NOT NULL CHECK (metodo_pago IN ('EFECTIVO','TARJETA_DEBITO','TARJETA_CREDITO','TRANSFERENCIA')),
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gastos_familia_fecha ON gastos (familia_id, fecha);

CREATE TABLE IF NOT EXISTS ingresos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  familia_id   INTEGER NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id),
  monto        REAL    NOT NULL CHECK (monto > 0),
  fecha        TEXT    NOT NULL,
  fuente       TEXT    NOT NULL,
  descripcion  TEXT    NOT NULL DEFAULT '',
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ingresos_familia_fecha ON ingresos (familia_id, fecha);

CREATE TABLE IF NOT EXISTS presupuestos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  familia_id    INTEGER NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  mes           TEXT    NOT NULL,
  monto_limite  REAL    NOT NULL CHECK (monto_limite > 0),
  UNIQUE (familia_id, categoria_id, mes)
);
`;

function abrir(ruta) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec(ESQUEMA);
  return db;
}

export const db = abrir(config.dbPath);

/** Ejecuta fn dentro de una transacción; revierte si lanza una excepción. */
export function transaccion(fn) {
  db.exec('BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
