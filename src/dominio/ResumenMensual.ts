import { Alerta } from './Alerta.js';
import { EjecucionPresupuesto } from './Presupuesto.js';
import type { Serializable } from './interfaces.js';
import type { AlertaDTO, ResumenMensualDTO, TotalCategoriaDTO, TotalMiembroDTO } from '../shared/contratos.js';

/** Totales crudos por categoría tal como los entrega el repositorio. */
export interface TotalCategoriaCrudo {
  id: number;
  nombre: string;
  color: string;
  total: number;
  presupuesto: number | null;
}

export interface DatosResumen {
  mes: string;
  totalIngresos: number;
  totalGastos: number;
  cantidadGastos: number;
  categorias: TotalCategoriaCrudo[];
  porMiembro: TotalMiembroDTO[];
  umbralAlerta: number;
}

const redondear = (valor: number, decimales: number): number => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

/**
 * Resumen financiero del mes (RF-11). Encapsula los cálculos que en JS
 * estaban mezclados dentro del servicio: balance, participación y alertas.
 */
export class ResumenMensual implements Serializable<ResumenMensualDTO> {
  readonly mes: string;
  readonly totalIngresos: number;
  readonly totalGastos: number;
  readonly cantidadGastos: number;
  readonly porCategoria: readonly TotalCategoriaDTO[];
  readonly porMiembro: readonly TotalMiembroDTO[];
  readonly #alertas: readonly Alerta[];

  constructor(datos: DatosResumen) {
    this.mes = datos.mes;
    this.totalIngresos = datos.totalIngresos;
    this.totalGastos = datos.totalGastos;
    this.cantidadGastos = datos.cantidadGastos;
    this.porMiembro = datos.porMiembro;

    const evaluadas = datos.categorias.map((c) => ({
      crudo: c,
      ejecucion: EjecucionPresupuesto.calcular(c.total, c.presupuesto, datos.umbralAlerta),
    }));

    this.porCategoria = evaluadas.map(({ crudo, ejecucion }) => ({
      categoriaId: crudo.id,
      nombre: crudo.nombre,
      color: crudo.color,
      total: crudo.total,
      presupuesto: crudo.presupuesto,
      participacion: this.totalGastos ? Math.round((crudo.total / this.totalGastos) * 1000) / 10 : 0,
      estado: ejecucion.estado,
      porcentaje: ejecucion.porcentaje,
    }));

    this.#alertas = evaluadas
      .filter(({ ejecucion }) => ejecucion.requiereAlerta)
      .map(({ crudo, ejecucion }) => new Alerta(crudo.nombre, ejecucion));
  }

  get balance(): number {
    return redondear(this.totalIngresos - this.totalGastos, 2);
  }

  get alertas(): AlertaDTO[] {
    return this.#alertas.map((a) => a.toJSON());
  }

  toJSON(): ResumenMensualDTO {
    return {
      mes: this.mes,
      totalIngresos: this.totalIngresos,
      totalGastos: this.totalGastos,
      balance: this.balance,
      cantidadGastos: this.cantidadGastos,
      porCategoria: [...this.porCategoria],
      porMiembro: [...this.porMiembro],
      alertas: this.alertas,
    };
  }
}
