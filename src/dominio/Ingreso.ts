import { Movimiento, type DatosMovimiento, type TipoMovimiento } from './Movimiento.js';
import type { IngresoDTO } from '../shared/contratos.js';

export interface DatosIngreso extends DatosMovimiento {
  fuente: string;
}

/** Entrada de dinero del hogar (RF-08). Hereda de Movimiento. */
export class Ingreso extends Movimiento<IngresoDTO> {
  readonly fuente: string;

  constructor(datos: DatosIngreso) {
    super(datos);
    this.fuente = datos.fuente;
  }

  override get tipo(): TipoMovimiento {
    return 'INGRESO';
  }

  override toJSON(): IngresoDTO {
    return { ...this.camposBase(), fuente: this.fuente };
  }
}
