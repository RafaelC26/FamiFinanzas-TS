/**
 * Contratos (DTO) compartidos entre el backend y el frontend.
 *
 * Es un archivo de declaraciones (.d.ts): no genera JavaScript, solo tipos.
 * El servidor los usa para tipar lo que responde (res.json) y el cliente
 * (client/*.ts) para tipar lo que recibe con fetch. Si un campo cambia aquí,
 * el compilador marca el error en ambos lados.
 */

export type RolDTO = 'ADMIN' | 'MIEMBRO';
export type MetodoPagoDTO = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';
export type EstadoPresupuestoDTO = 'OK' | 'ALERTA' | 'EXCEDIDO' | 'SIN_PRESUPUESTO';

export interface ReferenciaCategoriaDTO {
  id: number;
  nombre: string;
  color: string;
}

export interface ReferenciaUsuarioDTO {
  id: number;
  nombre: string;
}

export interface FamiliaDTO {
  id: number;
  nombre: string;
  moneda: string;
  creadoEn: string;
}

export interface UsuarioDTO {
  id: number;
  familiaId: number;
  nombre: string;
  email: string;
  rol: RolDTO;
  activo: boolean;
  creadoEn: string;
}

export interface PerfilDTO extends UsuarioDTO {
  familia: FamiliaDTO;
}

export interface SesionDTO {
  token: string;
  usuario: UsuarioDTO;
}

export interface CategoriaDTO extends ReferenciaCategoriaDTO {
  activo: boolean;
}

export interface MovimientoDTO {
  id: number;
  monto: number;
  fecha: string;
  descripcion: string;
  usuario: ReferenciaUsuarioDTO;
  creadoEn: string;
}

export interface GastoDTO extends MovimientoDTO {
  metodoPago: MetodoPagoDTO;
  categoria: ReferenciaCategoriaDTO;
}

export interface IngresoDTO extends MovimientoDTO {
  fuente: string;
}

export interface PresupuestoDTO {
  id: number;
  mes: string;
  montoLimite: number;
  categoria: ReferenciaCategoriaDTO;
}

export interface EjecucionPresupuestoDTO extends PresupuestoDTO {
  gastado: number;
  estado: EstadoPresupuestoDTO;
  porcentaje: number | null;
}

export interface AlertaDTO {
  categoria: string;
  estado: EstadoPresupuestoDTO;
  porcentaje: number | null;
  mensaje: string;
  mes?: string;
  gastado?: number;
  montoLimite?: number;
}

export interface TotalCategoriaDTO {
  categoriaId: number;
  nombre: string;
  color: string;
  total: number;
  presupuesto: number | null;
  participacion: number;
  estado: EstadoPresupuestoDTO;
  porcentaje: number | null;
}

export interface TotalMiembroDTO {
  usuarioId: number;
  nombre: string;
  total: number;
}

export interface ResumenMensualDTO {
  mes: string;
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  cantidadGastos: number;
  porCategoria: TotalCategoriaDTO[];
  porMiembro: TotalMiembroDTO[];
  alertas: AlertaDTO[];
}

export interface PaginacionDTO {
  pagina: number;
  limite: number;
  total: number;
  paginas: number;
}

/** Tipo genérico: una página de resultados de cualquier entidad. */
export interface PaginaDTO<T> {
  datos: T[];
  paginacion: PaginacionDTO;
  suma: number;
}

export interface DetalleErrorDTO {
  campo: string | null;
  mensaje: string;
}

export interface ErrorApiDTO {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: DetalleErrorDTO[];
  };
}
