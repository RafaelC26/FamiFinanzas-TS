import { reporteRepository } from '../repositories/reporteRepository.js';
import { estadoPresupuesto, mensajeAlerta } from './presupuestoService.js';

/** RF-11: resumen financiero del mes con alertas de presupuesto (RF-10). */
export const reporteService = {
  resumenMensual(actor, mes) {
    const { totalGastos, totalIngresos, cantidadGastos } = reporteRepository.totales(actor.familiaId, mes);
    const porCategoria = reporteRepository.porCategoria(actor.familiaId, mes).map((c) => ({
      categoriaId: c.id,
      nombre: c.nombre,
      color: c.color,
      total: c.total,
      presupuesto: c.presupuesto,
      participacion: totalGastos ? Math.round((c.total / totalGastos) * 1000) / 10 : 0,
      ...estadoPresupuesto(c.total, c.presupuesto),
    }));
    const alertas = porCategoria
      .filter((c) => c.estado === 'ALERTA' || c.estado === 'EXCEDIDO')
      .map((c) => ({ categoria: c.nombre, estado: c.estado, porcentaje: c.porcentaje, mensaje: mensajeAlerta(c.nombre, c) }));
    return {
      mes,
      totalIngresos,
      totalGastos,
      balance: Math.round((totalIngresos - totalGastos) * 100) / 100,
      cantidadGastos,
      porCategoria,
      porMiembro: reporteRepository.porMiembro(actor.familiaId, mes).map((m) => ({ usuarioId: m.id, nombre: m.nombre, total: m.total })),
      alertas,
    };
  },
};
