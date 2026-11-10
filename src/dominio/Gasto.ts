import { Movimiento, type DatosMovimiento, type TipoMovimiento } from './Movimiento.js';
import type { MetodoPago } from './enums.js';
import type { ExportableCsv } from './interfaces.js';
import type { GastoDTO, ReferenciaCategoriaDTO } from '../shared/contratos.js';

export interface DatosGasto extends DatosMovimiento {
  metodoPago: MetodoPago;
  categoria: ReferenciaCategoriaDTO;
}

/** Salida de dinero clasificada en una categoría (RF-05). Hereda de Movimiento. */
export class Gasto extends Movimiento<GastoDTO> implements ExportableCsv {
  static readonly ENCABEZADO_CSV = ['ID', 'Fecha', 'Categoría', 'Descripción', 'Método de pago', 'Registrado por', 'Monto'] as const;

  readonly metodoPago: MetodoPago;
  readonly categoria: ReferenciaCategoriaDTO;

  constructor(datos: DatosGasto) {
    super(datos);
    this.metodoPago = datos.metodoPago;
    this.categoria = datos.categoria;
  }

  override get tipo(): TipoMovimiento {
    return 'GASTO';
  }

  /** RF-12: el orden coincide con ENCABEZADO_CSV. */
  aFilaCsv(): ReadonlyArray<string | number> {
    return [this.id, this.fecha, this.categoria.nombre, this.descripcion, this.metodoPago, this.usuario.nombre, this.monto];
  }

  override toJSON(): GastoDTO {
    return { ...this.camposBase(), metodoPago: this.metodoPago, categoria: this.categoria };
  }
}
