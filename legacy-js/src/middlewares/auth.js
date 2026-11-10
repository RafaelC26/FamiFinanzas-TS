import { authService } from '../services/authService.js';
import { usuarioRepository } from '../repositories/usuarioRepository.js';
import { noAutenticado, prohibido } from '../utils/errores.js';

export const COOKIE_TOKEN = 'ff_token';

/** Valida el JWT y comprueba que el usuario siga activo; deja el actor en req.usuario. */
function resolverUsuario(token) {
  if (!token) throw noAutenticado();
  const payload = authService.verificarToken(token);
  const usuario = usuarioRepository.buscarPorId(Number(payload.sub));
  if (!usuario || !usuario.activo) throw noAutenticado('El usuario no existe o fue desactivado');
  return usuario;
}

/** API REST: token en la cabecera Authorization: Bearer <jwt>. */
export function autenticarApi(req, _res, next) {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  req.usuario = resolverUsuario(esquema === 'Bearer' ? token : null);
  next();
}

/** Front-end EJS: el mismo JWT viaja en una cookie httpOnly + SameSite=Strict. */
export function autenticarWeb(req, res, next) {
  try {
    req.usuario = resolverUsuario(req.cookies?.[COOKIE_TOKEN]);
    res.locals.usuario = req.usuario;
    next();
  } catch (err) {
    res.clearCookie(COOKIE_TOKEN);
    const motivo = req.cookies?.[COOKIE_TOKEN] ? '?msg=sesion' : '';
    res.redirect(`/login${motivo}`);
  }
}

/** Autorización por rol (RF-14). */
export const requerirRol = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.usuario.rol)) throw prohibido();
  next();
};
