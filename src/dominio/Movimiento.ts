import { Entidad } from './Entidad.js';
import type { Modificable, Actor } from './interfaces.js';
import type { MovimientoDTO, ReferenciaUsuarioDTO } from '../shared/contratos.js';

export type TipoMovimiento = 'GASTO' | 'INGRESO';

export interface DatosMovimiento {
  id: number;
  monto: number;
  fecha: string;
  descripcion: string;
  usuario: ReferenciaUsuarioDTO;
  creadoEn: string;
}

/**
 * Clase abstracta con lo común a gastos e ingresos (diagrama de clases del
 * Taller 2). En JS esta abstracción solo existía en el diagrama; aquí es real:
 * Gasto e Ingreso heredan atributos y la regla de propiedad `puedeSerModificadoPor`.
 *
 * El genérico `TDTO extends MovimientoDTO` garantiza que el JSON de cada
 * subclase incluya, como mínimo, los campos de un movimiento.
 */
export abstract class Movimiento<TDTO extends MovimientoDTO = MovimientoDTO>
  extends Entidad<TDTO>
  implements Modificable
{
  readonly monto: number;
  readonly fecha: string;
  readonly descripcion: string;
  readonly usuario: ReferenciaUsuarioDTO;
  readonly creadoEn: string;

  protected constructor(datos: DatosMovimiento) {
    super(datos.id);
    this.monto = datos.monto;
    this.fecha = datos.fecha;
    this.descripcion = datos.descripcion;
    this.usuario = datos.usuario;
    this.creadoEn = datos.creadoEn;
  }

  /** Cada subclase dice qué tipo de movimiento es (polimorfismo). */
  abstract get tipo(): TipoMovimiento;

  /** Mes contable del movimiento en formato AAAA-MM. */
  get mes(): string {
    return this.fecha.slice(0, 7);
  }

  /** RF-07: un miembro solo modifica lo que registró; el administrador, todo lo de su familia. */
  puedeSerModificadoPor(actor: Actor): boolean {
    return actor.esAdmin() || this.usuario.id === actor.id;
  }

  /** Campos comunes para que las subclases construyan su DTO sin repetir código. */
  protected camposBase(): MovimientoDTO {
    return {
      id: this.id,
      monto: this.monto,
      fecha: this.fecha,
      descripcion: this.descripcion,
      usuario: this.usuario,
      creadoEn: this.creadoEn,
    };
  }
}
