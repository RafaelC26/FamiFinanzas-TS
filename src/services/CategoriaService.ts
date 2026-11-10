import type { CategoriaRepository, OpcionesListadoCategorias } from '../repositories/CategoriaRepository.js';
import type { Categoria } from '../dominio/Categoria.js';
import type { Actor } from '../dominio/interfaces.js';
import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import type { EntradaCategoria } from '../utils/validacion.js';

/** Unión de literales: el compilador solo acepta estos dos resultados. */
export interface ResultadoEliminacion {
  resultado: 'DESACTIVADA' | 'ELIMINADA';
}

/** RF-04: gestión de categorías de gasto. */
export class CategoriaService {
  constructor(private readonly categorias: CategoriaRepository) {}

  listar(actor: Actor, opciones?: OpcionesListadoCategorias): Categoria[] {
    return this.categorias.listar(actor.familiaId, opciones);
  }

  obtener(actor: Actor, id: number): Categoria {
    const c = this.categorias.buscar(id, actor.familiaId);
    if (!c) throw new NoEncontradoError('Categoría');
    return c;
  }

  /** Devuelve la categoría solo si está activa (para registrar gastos o presupuestos). */
  obtenerActiva(actor: Actor, id: number): Categoria {
    const c = this.categorias.buscar(id, actor.familiaId);
    if (!c || !c.activo) throw new NoEncontradoError('Categoría');
    return c;
  }

  crear(actor: Actor, datos: EntradaCategoria): Categoria {
    const existente = this.categorias.buscarPorNombre(datos.nombre, actor.familiaId);
    if (existente?.activo) throw new ConflictoError('Ya existe una categoría con ese nombre');
    if (existente) return this.categorias.actualizar(existente.id, actor.familiaId, datos); // reactivar
    return this.categorias.crear(actor.familiaId, datos);
  }

  actualizar(actor: Actor, id: number, datos: EntradaCategoria): Categoria {
    this.obtener(actor, id);
    const otra = this.categorias.buscarPorNombre(datos.nombre, actor.familiaId);
    if (otra && otra.id !== id) throw new ConflictoError('Ya existe una categoría con ese nombre');
    return this.categorias.actualizar(id, actor.familiaId, datos);
  }

  /** Si la categoría tiene gastos se desactiva (integridad histórica); si no, se elimina. */
  eliminar(actor: Actor, id: number): ResultadoEliminacion {
    this.obtener(actor, id);
    if (this.categorias.tieneMovimientos(id)) {
      this.categorias.desactivar(id);
      return { resultado: 'DESACTIVADA' };
    }
    this.categorias.eliminar(id);
    return { resultado: 'ELIMINADA' };
  }
}
