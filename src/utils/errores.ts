import type { DetalleErrorDTO, ErrorApiDTO } from '../shared/contratos.js';

/**
 * Jerarquía de errores de la aplicación. En JS había una sola clase AppError y
 * funciones fábrica; aquí cada tipo de error es una subclase con su código HTTP
 * fijo, lo que permite `instanceof NoEncontradoError` y evita códigos mal escritos.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles?: DetalleErrorDTO[],
  ) {
    super(mensaje);
    this.name = new.target.name;
  }

  /** Cuerpo uniforme de la respuesta de error de la API. */
  aRespuesta(): ErrorApiDTO {
    return { error: { codigo: this.codigo, mensaje: this.message, ...(this.detalles ? { detalles: this.detalles } : {}) } };
  }
}

export class ValidacionError extends AppError {
  constructor(mensaje: string, detalles?: DetalleErrorDTO[]) {
    super(400, 'VALIDACION', mensaje, detalles);
  }
}

export class NoAutenticadoError extends AppError {
  constructor(mensaje = 'Debe iniciar sesión') {
    super(401, 'NO_AUTENTICADO', mensaje);
  }
}

export class ProhibidoError extends AppError {
  constructor(mensaje = 'No tiene permisos para realizar esta acción') {
    super(403, 'PROHIBIDO', mensaje);
  }
}

export class UsuarioInactivoError extends AppError {
  constructor() {
    super(403, 'USUARIO_INACTIVO', 'El usuario está desactivado. Contacte al administrador');
  }
}

export class NoEncontradoError extends AppError {
  constructor(recurso: string) {
    super(404, 'NO_ENCONTRADO', `${recurso} no encontrado`);
  }
}

export class ConflictoError extends AppError {
  constructor(mensaje: string) {
    super(409, 'CONFLICTO', mensaje);
  }
}
