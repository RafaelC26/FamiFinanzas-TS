import type { Usuario } from './Usuario.js';

/** Todo objeto que se envía al cliente sabe convertirse a su DTO (lo usa JSON.stringify / res.json). */
export interface Serializable<TDTO> {
  toJSON(): TDTO;
}

/** Regla de propiedad: quién puede editar o eliminar el objeto (RF-07). */
export interface Modificable {
  puedeSerModificadoPor(actor: Usuario): boolean;
}

/** Objetos que pueden exportarse como una fila de CSV (RF-12). */
export interface ExportableCsv {
  aFilaCsv(): ReadonlyArray<string | number>;
}

/** Datos mínimos que un servicio necesita del usuario autenticado. */
export interface Actor {
  readonly id: number;
  readonly familiaId: number;
  esAdmin(): boolean;
}
