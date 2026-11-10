import { AppError } from '../utils/errores.js';

/** Respuesta uniforme de error para la API: { error: { codigo, mensaje, detalles? } }. Nunca expone el stack. */
export function manejadorErroresApi(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo de la petición no es JSON válido' } });
  }
  if (err.status === 429) return res.status(429).json({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: err.message } });
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' } });
}

export function noEncontradoApi(req, res) {
  res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: `No existe ${req.method} ${req.originalUrl}` } });
}
