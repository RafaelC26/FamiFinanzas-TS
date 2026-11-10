import type { Configuracion } from '../config.js';
import type { PresupuestoRepository } from '../repositories/PresupuestoRepository.js';
import type { GastoRepository } from '../repositories/GastoRepository.js';
import type { CategoriaService } from './CategoriaService.js';
import { Alerta } from '../dominio/Alerta.js';
import type { Presupuesto } from '../dominio/Presupuesto.js';
import type { Actor } from '../dominio/interfaces.js';
import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import type { EntradaPresupuesto } from '../utils/validacion.js';
import type { EjecucionPresupuestoDTO } from '../shared/contratos.js';

/** RF-09 y RF-10: presupuestos mensuales por categoría y alertas. */
export class PresupuestoService {
  constructor(
    private readonly cfg: Configuracion,
    private readonly presupuestos: PresupuestoRepository,
    private readonly gastos: GastoRepository,
    private readonly categorias: CategoriaService,
  ) {}

  listar(actor: Actor, mes: string): EjecucionPresupuestoDTO[] {
    return this.presupuestos.listarPorMes(actor.familiaId, mes).map((p) => {
      const gastado = this.gastos.totalCategoriaMes(actor.familiaId, p.categoria.id, p.mes);
      return p.conEjecucion(gastado, this.cfg.umbralAlerta);
    });
  }

  obtener(actor: Actor, id: number): Presupuesto {
    const p = this.presupuestos.buscar(id, actor.familiaId);
    if (!p) throw new NoEncontradoError('Presupuesto');
    return p;
  }

  crear(actor: Actor, datos: EntradaPresupuesto): Presupuesto {
    this.categorias.obtenerActiva(actor, datos.categoriaId);
    if (this.presupuestos.buscarPorCategoriaMes(actor.familiaId, datos.categoriaId, datos.mes)) {
      throw new ConflictoError('Ya existe un presupuesto para esa categoría en ese mes');
    }
    return this.presupuestos.crear(actor.familiaId, datos);
  }

  actualizar(actor: Actor, id: number, montoLimite: number): Presupuesto {
    this.obtener(actor, id);
    return this.presupuestos.actualizar(id, actor.familiaId, montoLimite);
  }

  eliminar(actor: Actor, id: number): void {
    this.obtener(actor, id);
    this.presupuestos.eliminar(id, actor.familiaId);
  }

  /** Alerta para una categoría y mes concretos, o null si está dentro del rango normal. */
  alertaCategoria(actor: Actor, categoriaId: number, mes: string): Alerta | null {
    const p = this.presupuestos.buscarPorCategoriaMes(actor.familiaId, categoriaId, mes);
    if (!p) return null;
    const gastado = this.gastos.totalCategoriaMes(actor.familiaId, categoriaId, mes);
    const ejecucion = p.evaluar(gastado, this.cfg.umbralAlerta);
    if (!ejecucion.requiereAlerta) return null;
    return new Alerta(p.categoria.nombre, ejecucion, { mes, gastado, montoLimite: p.montoLimite });
  }
}
