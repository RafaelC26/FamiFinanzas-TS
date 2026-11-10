import type { EjecucionPresupuesto } from './Presupuesto.js';
import type { EstadoPresupuesto } from './enums.js';
import type { Serializable } from './interfaces.js';
import type { AlertaDTO } from '../shared/contratos.js';

/** Información adicional cuando la alerta nace al registrar un gasto. */
export interface ContextoAlerta {
  mes: string;
  gastado: number;
  montoLimite: number;
}

/** Aviso de presupuesto (RF-10). Objeto calculado, no se persiste. */
export class Alerta implements Serializable<AlertaDTO> {
  constructor(
    readonly categoria: string,
    private readonly ejecucion: EjecucionPresupuesto,
    private readonly contexto?: ContextoAlerta,
  ) {}

  get estado(): EstadoPresupuesto {
    return this.ejecucion.estado;
  }

  get porcentaje(): number | null {
    return this.ejecucion.porcentaje;
  }

  get mensaje(): string {
    return this.ejecucion.mensajePara(this.categoria);
  }

  toJSON(): AlertaDTO {
    return { categoria: this.categoria, ...this.contexto, estado: this.estado, porcentaje: this.porcentaje, mensaje: this.mensaje };
  }
}
