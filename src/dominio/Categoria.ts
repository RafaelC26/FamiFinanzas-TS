import { Entidad } from './Entidad.js';
import type { CategoriaDTO, ReferenciaCategoriaDTO } from '../shared/contratos.js';

export interface DatosCategoria {
  id: number;
  nombre: string;
  color: string;
  activo: boolean;
}

/** Clasificación de los gastos. Si tiene historial se desactiva en lugar de borrarse (RF-04). */
export class Categoria extends Entidad<CategoriaDTO> {
  static readonly COLOR_POR_DEFECTO = '#4f46e5';

  readonly nombre: string;
  readonly color: string;
  readonly activo: boolean;

  constructor(datos: DatosCategoria) {
    super(datos.id);
    this.nombre = datos.nombre;
    this.color = datos.color;
    this.activo = datos.activo;
  }

  /** Versión reducida que se incrusta en gastos y presupuestos. */
  get referencia(): ReferenciaCategoriaDTO {
    return { id: this.id, nombre: this.nombre, color: this.color };
  }

  override toJSON(): CategoriaDTO {
    return { ...this.referencia, activo: this.activo };
  }
}
