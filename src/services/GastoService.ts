import { MovimientoService } from './MovimientoService.js';
import type { CategoriaService } from './CategoriaService.js';
import type { PresupuestoService } from './PresupuestoService.js';
import type { GastoRepository } from '../repositories/GastoRepository.js';
import type { CriteriosMovimiento } from '../repositories/MovimientoRepository.js';
import { Gasto } from '../dominio/Gasto.js';
import type { Alerta } from '../dominio/Alerta.js';
import type { Actor } from '../dominio/interfaces.js';
import type { EntradaGasto } from '../utils/validacion.js';

export interface ResultadoGasto {
  gasto: Gasto;
  alerta: Alerta | null;
}

/** RF-05, RF-06, RF-07, RF-10, RF-12: gastos. */
export class GastoService extends MovimientoService<Gasto, GastoRepository> {
  protected override readonly recurso = 'Gasto';

  constructor(
    repositorio: GastoRepository,
    private readonly categorias: CategoriaService,
    private readonly presupuestos: PresupuestoService,
  ) {
    super(repositorio);
  }

  /** Registra el gasto y devuelve la alerta de presupuesto si corresponde (RF-10). */
  crear(actor: Actor, datos: EntradaGasto): ResultadoGasto {
    this.categorias.obtenerActiva(actor, datos.categoriaId);
    const gasto = this.repositorio.crear(actor.familiaId, actor.id, datos);
    return { gasto, alerta: this.presupuestos.alertaCategoria(actor, datos.categoriaId, gasto.mes) };
  }

  actualizar(actor: Actor, id: number, datos: EntradaGasto): ResultadoGasto {
    const actual = this.obtener(actor, id);
    this.verificarPropiedad(actor, actual);
    if (datos.categoriaId !== actual.categoria.id) this.categorias.obtenerActiva(actor, datos.categoriaId);
    const gasto = this.repositorio.actualizar(id, actor.familiaId, datos);
    return { gasto, alerta: this.presupuestos.alertaCategoria(actor, datos.categoriaId, gasto.mes) };
  }

  /** RF-12: exporta los gastos filtrados en CSV (separador ';' compatible con Excel en español). */
  exportarCsv(actor: Actor, criterios: CriteriosMovimiento): string {
    const esc = (v: string | number): string => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const linea = (valores: ReadonlyArray<string | number>): string => valores.map(esc).join(';');
    const filas = this.repositorio.listarTodos(actor.familiaId, criterios).map((g) => linea(g.aFilaCsv()));
    return '﻿' + [Gasto.ENCABEZADO_CSV.join(';'), ...filas].join('\r\n');
  }
}
