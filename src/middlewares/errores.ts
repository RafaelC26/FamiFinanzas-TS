import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/errores.js';
import type { ErrorApiDTO } from '../shared/contratos.js';

/** Errores que lanzan los middlewares de Express (body-parser, rate-limit). */
interface ErrorExpress {
  type?: string;
  status?: number;
  message?: string;
}

const esErrorExpress = (err: unknown): err is ErrorExpress => typeof err === 'object' && err !== null;

/** Respuesta uniforme de error para la API: { error: { codigo, mensaje, detalles? } }. Nunca expone el stack. */
export const manejadorErroresApi: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(err.aRespuesta());
    return;
  }
  if (esErrorExpress(err) && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo de la petición no es JSON válido' } } satisfies ErrorApiDTO);
    return;
  }
  if (esErrorExpress(err) && err.status === 429) {
    res.status(429).json({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: err.message ?? 'Demasiadas peticiones' } } satisfies ErrorApiDTO);
    return;
  }
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' } } satisfies ErrorApiDTO);
};

export const noEncontradoApi: RequestHandler = (req, res) => {
  res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: `No existe ${req.method} ${req.originalUrl}` } } satisfies ErrorApiDTO);
};
