import { MovimientoService } from './MovimientoService.js';
import type { IngresoRepository } from '../repositories/IngresoRepository.js';
import type { Ingreso } from '../dominio/Ingreso.js';
import type { Actor } from '../dominio/interfaces.js';
import type { EntradaIngreso } from '../utils/validacion.js';

/** RF-08: ingresos. Hereda listar/obtener/eliminar de MovimientoService. */
export class IngresoService extends MovimientoService<Ingreso, IngresoRepository> {
  protected override readonly recurso = 'Ingreso';

  constructor(repositorio: IngresoRepository) {
    super(repositorio);
  }

  crear(actor: Actor, datos: EntradaIngreso): Ingreso {
    return this.repositorio.crear(actor.familiaId, actor.id, datos);
  }

  actualizar(actor: Actor, id: number, datos: EntradaIngreso): Ingreso {
    this.verificarPropiedad(actor, this.obtener(actor, id));
    return this.repositorio.actualizar(id, actor.familiaId, datos);
  }
}
