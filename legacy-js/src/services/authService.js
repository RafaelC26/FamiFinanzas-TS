import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { transaccion } from '../db/database.js';
import { familiaRepository } from '../repositories/familiaRepository.js';
import { usuarioRepository } from '../repositories/usuarioRepository.js';
import { categoriaRepository } from '../repositories/categoriaRepository.js';
import { AppError, conflicto, noAutenticado } from '../utils/errores.js';

export const CATEGORIAS_INICIALES = [
  ['Alimentación', '#16a34a'],
  ['Vivienda', '#2563eb'],
  ['Servicios públicos', '#0891b2'],
  ['Transporte', '#ca8a04'],
  ['Salud', '#dc2626'],
  ['Educación', '#7c3aed'],
  ['Entretenimiento', '#db2777'],
  ['Otros', '#64748b'],
];

// Hash ficticio para comparar cuando el correo no existe (evita enumeración por tiempo de respuesta).
const HASH_FICTICIO = bcrypt.hashSync('usuario-inexistente', config.bcryptCosto);

const sinHash = ({ passwordHash, ...u }) => u;

export const authService = {
  hashear: (password) => bcrypt.hash(password, config.bcryptCosto),

  generarToken(usuario) {
    return jwt.sign({ fam: usuario.familiaId, rol: usuario.rol, nombre: usuario.nombre }, config.jwt.secreto, {
      subject: String(usuario.id),
      expiresIn: config.jwt.expiraEn,
      issuer: config.jwt.emisor,
      algorithm: 'HS256',
    });
  },

  /** Verifica firma, emisor y expiración. Devuelve el payload o lanza 401. */
  verificarToken(token) {
    try {
      return jwt.verify(token, config.jwt.secreto, { algorithms: ['HS256'], issuer: config.jwt.emisor });
    } catch (err) {
      throw noAutenticado(err.name === 'TokenExpiredError' ? 'La sesión ha expirado' : 'Token inválido');
    }
  },

  /** RF-01: registra la familia, su administrador y las categorías iniciales en una sola transacción. */
  async registrar({ familia, nombre, email, password }) {
    if (usuarioRepository.existeEmail(email)) throw conflicto('El correo ya está registrado');
    const passwordHash = await this.hashear(password);
    const usuario = transaccion(() => {
      const fam = familiaRepository.crear({ nombre: familia });
      for (const [n, color] of CATEGORIAS_INICIALES) categoriaRepository.crear(fam.id, { nombre: n, color });
      return usuarioRepository.crear({ familiaId: fam.id, nombre, email, passwordHash, rol: 'ADMIN' });
    });
    return { token: this.generarToken(usuario), usuario };
  },

  /** RF-02: autentica por correo y contraseña y emite un JWT. */
  async login({ email, password }) {
    const u = usuarioRepository.buscarPorEmailConHash(email);
    const ok = await bcrypt.compare(password, u?.passwordHash ?? HASH_FICTICIO);
    if (!u || !ok) throw noAutenticado('Correo o contraseña incorrectos');
    if (!u.activo) throw new AppError(403, 'USUARIO_INACTIVO', 'El usuario está desactivado. Contacte al administrador');
    const usuario = sinHash(u);
    return { token: this.generarToken(usuario), usuario };
  },

  perfil(usuarioId) {
    const usuario = usuarioRepository.buscarPorId(usuarioId);
    return { ...usuario, familia: familiaRepository.buscarPorId(usuario.familiaId) };
  },

  /** RF-13: cambio de contraseña verificando la actual. */
  async cambiarPassword(usuarioId, { actual, nueva }) {
    const u = usuarioRepository.buscarPorIdConHash(usuarioId);
    if (!(await bcrypt.compare(actual, u.passwordHash))) {
      throw new AppError(400, 'VALIDACION', 'La contraseña actual no es correcta');
    }
    usuarioRepository.actualizarPassword(usuarioId, await this.hashear(nueva));
  },
};
