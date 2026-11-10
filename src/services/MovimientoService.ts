import type { MovimientoRepository } from '../repositories/MovimientoRepository.js';
import type { ResultadoListado } from '../repositories/RepositorioBase.js';
import type { Movimiento } from '../dominio/Movimiento.js';
import type { Actor } from '../dominio/interfaces.js';
import { NoEncontradoError, ProhibidoError } from '../utils/errores.js';
import type { FiltroMovimientos } from '../utils/validacion.js';
import type { PaginacionDTO } from '../shared/contratos.js';

/** Página de resultados con entidades de dominio (se serializa a PaginaDTO<T>). */
export interface Pagina<T> {
  datos: T[];
  paginacion: PaginacionDTO;
  suma: number;
}

/**
 * Servicio genérico y abstracto para cualquier tipo de movimiento.
 * GastoService e IngresoService heredan listar, obtener, eliminar y la regla de
 * propiedad; en JS estas funciones estaban duplicadas en dos objetos literales.
 */
export abstract class MovimientoService<T extends Movimiento, R extends MovimientoRepository<T, object>> {
  /** Nombre del recurso para los mensajes de error ("Gasto no encontrado"). */
  protected abstract readonly recurso: string;

  protected constructor(protected readonly repositorio: R) {}

  protected paginar({ datos, total, suma }: ResultadoListado<T>, { pagina, limite }: FiltroMovimientos): Pagina<T> {
    return { datos, paginacion: { pagina, limite, total, paginas: Math.max(1, Math.ceil(total / limite)) }, suma };
  }

  /** RF-07: lanza 403 si el actor no puede modificar el movimiento. */
  protected verificarPropiedad(actor: Actor, movimiento: T): void {
    if (!movimiento.puedeSerModificadoPor(actor)) {
      throw new ProhibidoError('Solo puede modificar los movimientos que usted registró');
    }
  }

  listar(actor: Actor, filtro: FiltroMovimientos): Pagina<T> {
    return this.paginar(this.repositorio.listar(actor.familiaId, filtro), filtro);
  }

  obtener(actor: Actor, id: number): T {
    const m = this.repositorio.buscar(id, actor.familiaId);
    if (!m) throw new NoEncontradoError(this.recurso);
    return m;
  }

  eliminar(actor: Actor, id: number): void {
    this.verificarPropiedad(actor, this.obtener(actor, id));
    this.repositorio.eliminar(id, actor.familiaId);
  }
}
