/** Error de aplicación con código HTTP y código semántico (respuesta uniforme de la API). */
export class AppError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export const noEncontrado = (recurso) => new AppError(404, 'NO_ENCONTRADO', `${recurso} no encontrado`);
export const prohibido = (mensaje = 'No tiene permisos para realizar esta acción') =>
  new AppError(403, 'PROHIBIDO', mensaje);
export const noAutenticado = (mensaje = 'Debe iniciar sesión') => new AppError(401, 'NO_AUTENTICADO', mensaje);
export const conflicto = (mensaje) => new AppError(409, 'CONFLICTO', mensaje);
export const solicitudInvalida = (mensaje, detalles) => new AppError(400, 'VALIDACION', mensaje, detalles);
