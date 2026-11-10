import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { authService, usuarioRepository } from '../contenedor.js';
import type { Rol } from '../dominio/enums.js';
import type { Usuario } from '../dominio/Usuario.js';
import { NoAutenticadoError, ProhibidoError } from '../utils/errores.js';

export const COOKIE_TOKEN = 'ff_token';

/** Valida el JWT y comprueba que el usuario siga activo. */
function resolverUsuario(token: string | undefined): Usuario {
  if (!token) throw new NoAutenticadoError();
  const payload = authService.verificarToken(token);
  const usuario = usuarioRepository.buscarPorId(Number(payload.sub));
  if (!usuario || !usuario.activo) throw new NoAutenticadoError('El usuario no existe o fue desactivado');
  return usuario;
}

export const tokenDeCookie = (req: Request): string | undefined => {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[COOKIE_TOKEN];
};

/**
 * Devuelve el usuario autenticado de la petición. Si una ruta protegida se
 * usara sin el middleware, falla con 401 en lugar de un "undefined" silencioso.
 */
export function actor(req: Request): Usuario {
  if (!req.usuario) throw new NoAutenticadoError();
  return req.usuario;
}

/** API REST: token en la cabecera Authorization: Bearer <jwt>. */
export const autenticarApi: RequestHandler = (req, _res, next) => {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  req.usuario = resolverUsuario(esquema === 'Bearer' ? token : undefined);
  next();
};

/** Front-end EJS: el mismo JWT viaja en una cookie httpOnly + SameSite=Strict. */
export function autenticarWeb(req: Request, res: Response, next: NextFunction): void {
  try {
    req.usuario = resolverUsuario(tokenDeCookie(req));
    res.locals['usuario'] = req.usuario;
    next();
  } catch {
    res.clearCookie(COOKIE_TOKEN);
    res.redirect(`/login${tokenDeCookie(req) ? '?msg=sesion' : ''}`);
  }
}

/** Autorización por rol (RF-14). Parámetros rest tipados: solo acepta valores del enum Rol. */
export const requerirRol = (...roles: Rol[]): RequestHandler => (req, _res, next) => {
  if (!roles.includes(actor(req).rol)) throw new ProhibidoError();
  next();
};
