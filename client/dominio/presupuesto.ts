import type { EstadoPresupuestoDTO } from '../../src/shared/contratos.js';

/** Mismo umbral que el servidor (config.umbralAlerta). */
export const UMBRAL_ALERTA = 0.8;

export const ETIQUETA_ESTADO: Readonly<Record<EstadoPresupuestoDTO, string>> = {
  OK: 'En rango',
  ALERTA: 'Alerta',
  EXCEDIDO: 'Excedido',
  SIN_PRESUPUESTO: 'Sin presupuesto',
};

export interface Proyeccion {
  estado: Exclude<EstadoPresupuestoDTO, 'SIN_PRESUPUESTO'>;
  porcentaje: number;
  disponible: number;
}

/** Calcula cómo quedaría un presupuesto si se suma `nuevo` a lo ya `gastado` (RF-10 en el cliente). */
export function proyectar(gastado: number, nuevo: number, limite: number): Proyeccion {
  const total = gastado + nuevo;
  const porcentaje = Math.round((total / limite) * 1000) / 10;
  const estado = total >= limite ? 'EXCEDIDO' : total >= limite * UMBRAL_ALERTA ? 'ALERTA' : 'OK';
  return { estado, porcentaje, disponible: Math.max(0, limite - total) };
}
