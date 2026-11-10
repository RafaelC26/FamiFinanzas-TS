import type { Configuracion } from '../config.js';
import type { ReporteRepository } from '../repositories/ReporteRepository.js';
import { ResumenMensual } from '../dominio/ResumenMensual.js';
import type { Actor } from '../dominio/interfaces.js';

/** RF-11: resumen financiero del mes con alertas de presupuesto (RF-10). */
export class ReporteService {
  constructor(
    private readonly cfg: Configuracion,
    private readonly reportes: ReporteRepository,
  ) {}

  resumenMensual(actor: Actor, mes: string): ResumenMensual {
    return new ResumenMensual({
      mes,
      ...this.reportes.totales(actor.familiaId, mes),
      categorias: this.reportes.porCategoria(actor.familiaId, mes),
      porMiembro: this.reportes.porMiembro(actor.familiaId, mes),
      umbralAlerta: this.cfg.umbralAlerta,
    });
  }
}
