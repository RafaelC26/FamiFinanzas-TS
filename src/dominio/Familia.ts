import { Entidad } from './Entidad.js';
import type { FamiliaDTO } from '../shared/contratos.js';

export interface DatosFamilia {
  id: number;
  nombre: string;
  moneda: string;
  creadoEn: string;
}

/** Unidad de aislamiento de datos: todo registro pertenece a una familia (multi-inquilino). */
export class Familia extends Entidad<FamiliaDTO> {
  readonly nombre: string;
  readonly moneda: string;
  readonly creadoEn: string;

  constructor(datos: DatosFamilia) {
    super(datos.id);
    this.nombre = datos.nombre;
    this.moneda = datos.moneda;
    this.creadoEn = datos.creadoEn;
  }

  override toJSON(): FamiliaDTO {
    return { id: this.id, nombre: this.nombre, moneda: this.moneda, creadoEn: this.creadoEn };
  }
}
