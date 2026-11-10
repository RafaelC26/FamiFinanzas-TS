import { categoriaRepository } from '../repositories/categoriaRepository.js';
import { conflicto, noEncontrado } from '../utils/errores.js';

/** RF-04: gestión de categorías de gasto. */
export const categoriaService = {
  listar: (actor, opciones) => categoriaRepository.listar(actor.familiaId, opciones),

  obtener(actor, id) {
    const c = categoriaRepository.buscar(id, actor.familiaId);
    if (!c) throw noEncontrado('Categoría');
    return c;
  },

  /** Devuelve la categoría solo si está activa (para registrar gastos o presupuestos). */
  obtenerActiva(actor, id) {
    const c = categoriaRepository.buscar(id, actor.familiaId);
    if (!c || !c.activo) throw noEncontrado('Categoría');
    return c;
  },

  crear(actor, datos) {
    const existente = categoriaRepository.buscarPorNombre(datos.nombre, actor.familiaId);
    if (existente?.activo) throw conflicto('Ya existe una categoría con ese nombre');
    if (existente) return categoriaRepository.actualizar(existente.id, actor.familiaId, datos); // reactivar
    return categoriaRepository.crear(actor.familiaId, datos);
  },

  actualizar(actor, id, datos) {
    this.obtener(actor, id);
    const otra = categoriaRepository.buscarPorNombre(datos.nombre, actor.familiaId);
    if (otra && otra.id !== id) throw conflicto('Ya existe una categoría con ese nombre');
    return categoriaRepository.actualizar(id, actor.familiaId, datos);
  },

  /** Si la categoría tiene gastos se desactiva (integridad histórica); si no, se elimina. */
  eliminar(actor, id) {
    this.obtener(actor, id);
    if (categoriaRepository.tieneMovimientos(id)) {
      categoriaRepository.desactivar(id);
      return { resultado: 'DESACTIVADA' };
    }
    categoriaRepository.eliminar(id);
    return { resultado: 'ELIMINADA' };
  },
};
