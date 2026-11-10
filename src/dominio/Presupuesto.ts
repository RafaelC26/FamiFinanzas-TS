import { Entidad } from './Entidad.js';
import { EstadoPresupuesto } from './enums.js';
import type { EjecucionPresupuestoDTO, PresupuestoDTO, ReferenciaCategoriaDTO } from '../shared/contratos.js';

/**
 * Objeto de valor (inmutable) con el resultado de comparar lo gastado contra
 * el límite. Reemplaza a la función suelta estadoPresupuesto() de la versión JS.
 * El constructor es privado: solo se crea con EjecucionPresupuesto.calcular().
 */
export class EjecucionPresupuesto {
  private constructor(
    readonly estado: EstadoPresupuesto,
    readonly porcentaje: number | null,
  ) {}

  /** RF-10: OK < umbral (80 %) <= ALERTA < 100 % <= EXCEDIDO. */
  static calcular(total: number, limite: number | null | undefined, umbral: number): EjecucionPresupuesto {
    if (limite == null) return new EjecucionPresupuesto(EstadoPresupuesto.SIN_PRESUPUESTO, null);
    const porcentaje = Math.round((total / limite) * 1000) / 10;
    if (total >= limite) return new EjecucionPresupuesto(EstadoPresupuesto.EXCEDIDO, porcentaje);
    if (total >= limite * umbral) return new EjecucionPresupuesto(EstadoPresupuesto.ALERTA, porcentaje);
    return new EjecucionPresupuesto(EstadoPresupuesto.OK, porcentaje);
  }

  get requiereAlerta(): boolean {
    return this.estado === EstadoPresupuesto.ALERTA || this.estado === EstadoPresupuesto.EXCEDIDO;
  }

  mensajePara(categoria: string): string {
    return this.estado === EstadoPresupuesto.EXCEDIDO
      ? `Se superó el presupuesto de ${categoria} (${this.porcentaje}% ejecutado)`
      : `El presupuesto de ${categoria} va en ${this.porcentaje}%`;
  }
}

export interface DatosPresupuesto {
  id: number;
  mes: string;
  montoLimite: number;
  categoria: ReferenciaCategoriaDTO;
}

/** Límite mensual de gasto para una categoría (RF-09). */
export class Presupuesto extends Entidad<PresupuestoDTO> {
  readonly mes: string;
  readonly montoLimite: number;
  readonly categoria: ReferenciaCategoriaDTO;

  constructor(datos: DatosPresupuesto) {
    super(datos.id);
    this.mes = datos.mes;
    this.montoLimite = datos.montoLimite;
    this.categoria = datos.categoria;
  }

  evaluar(gastado: number, umbral: number): EjecucionPresupuesto {
    return EjecucionPresupuesto.calcular(gastado, this.montoLimite, umbral);
  }

  /** DTO con la ejecución del mes (lo que lista la pantalla de presupuestos). */
  conEjecucion(gastado: number, umbral: number): EjecucionPresupuestoDTO {
    const { estado, porcentaje } = this.evaluar(gastado, umbral);
    return { ...this.toJSON(), gastado, estado, porcentaje };
  }

  override toJSON(): PresupuestoDTO {
    return { id: this.id, mes: this.mes, montoLimite: this.montoLimite, categoria: this.categoria };
  }
}
