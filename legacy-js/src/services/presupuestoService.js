import { config } from '../config.js';
import { presupuestoRepository } from '../repositories/presupuestoRepository.js';
import { gastoRepository } from '../repositories/gastoRepository.js';
import { categoriaService } from './categoriaService.js';
import { conflicto, noEncontrado } from '../utils/errores.js';

/** Clasifica la ejecución de un presupuesto (RF-10). */
export function estadoPresupuesto(total, limite) {
  if (limite == null) return { estado: 'SIN_PRESUPUESTO', porcentaje: null };
  const porcentaje = Math.round((total / limite) * 1000) / 10;
  if (total >= limite) return { estado: 'EXCEDIDO', porcentaje };
  if (total >= limite * config.umbralAlerta) return { estado: 'ALERTA', porcentaje };
  return { estado: 'OK', porcentaje };
}

/** RF-09: presupuestos mensuales por categoría. */
export const presupuestoService = {
  listar(actor, mes) {
    return presupuestoRepository.listarPorMes(actor.familiaId, mes).map((p) => {
      const gastado = gastoRepository.totalCategoriaMes(actor.familiaId, p.categoria.id, p.mes);
      return { ...p, gastado, ...estadoPresupuesto(gastado, p.montoLimite) };
    });
  },

  obtener(actor, id) {
    const p = presupuestoRepository.buscar(id, actor.familiaId);
    if (!p) throw noEncontrado('Presupuesto');
    return p;
  },

  crear(actor, { categoriaId, mes, montoLimite }) {
    categoriaService.obtenerActiva(actor, categoriaId);
    if (presupuestoRepository.buscarPorCategoriaMes(actor.familiaId, categoriaId, mes)) {
      throw conflicto('Ya existe un presupuesto para esa categoría en ese mes');
    }
    return presupuestoRepository.crear(actor.familiaId, { categoriaId, mes, montoLimite });
  },

  actualizar(actor, id, montoLimite) {
    this.obtener(actor, id);
    return presupuestoRepository.actualizar(id, actor.familiaId, montoLimite);
  },

  eliminar(actor, id) {
    this.obtener(actor, id);
    presupuestoRepository.eliminar(id, actor.familiaId);
  },

  /** Alerta para una categoría y mes concretos, o null si está dentro del rango normal. */
  alertaCategoria(actor, categoriaId, mes) {
    const p = presupuestoRepository.buscarPorCategoriaMes(actor.familiaId, categoriaId, mes);
    if (!p) return null;
    const gastado = gastoRepository.totalCategoriaMes(actor.familiaId, categoriaId, mes);
    const e = estadoPresupuesto(gastado, p.montoLimite);
    if (e.estado === 'OK') return null;
    return { categoria: p.categoria.nombre, mes, gastado, montoLimite: p.montoLimite, ...e, mensaje: mensajeAlerta(p.categoria.nombre, e) };
  },
};

export function mensajeAlerta(categoria, { estado, porcentaje }) {
  return estado === 'EXCEDIDO'
    ? `Se superó el presupuesto de ${categoria} (${porcentaje}% ejecutado)`
    : `El presupuesto de ${categoria} va en ${porcentaje}%`;
}
