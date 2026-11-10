import { gastoRepository } from '../repositories/gastoRepository.js';
import { ingresoRepository } from '../repositories/ingresoRepository.js';
import { categoriaService } from './categoriaService.js';
import { presupuestoService } from './presupuestoService.js';
import { noEncontrado, prohibido } from '../utils/errores.js';

/** Un miembro solo modifica sus propios movimientos; el administrador, los de toda la familia. */
function verificarPropiedad(actor, movimiento) {
  if (actor.rol !== 'ADMIN' && movimiento.usuario.id !== actor.id) {
    throw prohibido('Solo puede modificar los movimientos que usted registró');
  }
}

const paginar = ({ datos, total, suma }, { pagina, limite }) => ({
  datos,
  paginacion: { pagina, limite, total, paginas: Math.max(1, Math.ceil(total / limite)) },
  suma,
});

/** RF-05, RF-06, RF-07, RF-12: gastos. */
export const gastoService = {
  listar: (actor, filtro) => paginar(gastoRepository.listar(actor.familiaId, filtro), filtro),

  obtener(actor, id) {
    const g = gastoRepository.buscar(id, actor.familiaId);
    if (!g) throw noEncontrado('Gasto');
    return g;
  },

  /** Registra el gasto y devuelve la alerta de presupuesto si corresponde (RF-10). */
  crear(actor, datos) {
    categoriaService.obtenerActiva(actor, datos.categoriaId);
    const gasto = gastoRepository.crear(actor.familiaId, actor.id, datos);
    const alerta = presupuestoService.alertaCategoria(actor, datos.categoriaId, datos.fecha.slice(0, 7));
    return { gasto, alerta };
  },

  actualizar(actor, id, datos) {
    const actual = this.obtener(actor, id);
    verificarPropiedad(actor, actual);
    if (datos.categoriaId !== actual.categoria.id) categoriaService.obtenerActiva(actor, datos.categoriaId);
    const gasto = gastoRepository.actualizar(id, actor.familiaId, datos);
    const alerta = presupuestoService.alertaCategoria(actor, datos.categoriaId, datos.fecha.slice(0, 7));
    return { gasto, alerta };
  },

  eliminar(actor, id) {
    verificarPropiedad(actor, this.obtener(actor, id));
    gastoRepository.eliminar(id, actor.familiaId);
  },

  /** RF-12: exporta los gastos filtrados en formato CSV (separador ';' compatible con Excel en español). */
  exportarCsv(actor, filtro) {
    const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const filas = gastoRepository.listarTodos(actor.familiaId, filtro).map((g) =>
      [g.id, g.fecha, g.categoria.nombre, g.descripcion, g.metodoPago, g.usuario.nombre, g.monto].map(esc).join(';')
    );
    return '﻿' + ['ID;Fecha;Categoría;Descripción;Método de pago;Registrado por;Monto', ...filas].join('\r\n');
  },
};

/** RF-08: ingresos. */
export const ingresoService = {
  listar: (actor, filtro) => paginar(ingresoRepository.listar(actor.familiaId, filtro), filtro),

  obtener(actor, id) {
    const i = ingresoRepository.buscar(id, actor.familiaId);
    if (!i) throw noEncontrado('Ingreso');
    return i;
  },

  crear: (actor, datos) => ingresoRepository.crear(actor.familiaId, actor.id, datos),

  actualizar(actor, id, datos) {
    verificarPropiedad(actor, this.obtener(actor, id));
    return ingresoRepository.actualizar(id, actor.familiaId, datos);
  },

  eliminar(actor, id) {
    verificarPropiedad(actor, this.obtener(actor, id));
    ingresoRepository.eliminar(id, actor.familiaId);
  },
};
