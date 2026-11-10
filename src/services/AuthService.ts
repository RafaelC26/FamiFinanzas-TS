import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { Configuracion } from '../config.js';
import type { BaseDatos } from '../db/database.js';
import type { FamiliaRepository } from '../repositories/FamiliaRepository.js';
import type { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import type { CategoriaRepository } from '../repositories/CategoriaRepository.js';
import { Rol } from '../dominio/enums.js';
import type { Usuario } from '../dominio/Usuario.js';
import { ConflictoError, NoAutenticadoError, NoEncontradoError, UsuarioInactivoError, ValidacionError } from '../utils/errores.js';
import type { EntradaCambioPassword, EntradaLogin, EntradaRegistro } from '../utils/validacion.js';
import type { PerfilDTO } from '../shared/contratos.js';

/** Categorías creadas al registrar una familia: tupla [nombre, color]. */
export const CATEGORIAS_INICIALES: ReadonlyArray<readonly [nombre: string, color: string]> = [
  ['Alimentación', '#16a34a'],
  ['Vivienda', '#2563eb'],
  ['Servicios públicos', '#0891b2'],
  ['Transporte', '#ca8a04'],
  ['Salud', '#dc2626'],
  ['Educación', '#7c3aed'],
  ['Entretenimiento', '#db2777'],
  ['Otros', '#64748b'],
];

/** Contenido propio del JWT (además de sub, iss, exp...). */
export interface PayloadToken extends JwtPayload {
  sub: string;
  fam: number;
  rol: Rol;
  nombre: string;
}

/** Type guard: comprueba en ejecución que el payload tiene la forma esperada. */
function esPayloadToken(p: string | JwtPayload): p is PayloadToken {
  return typeof p === 'object' && typeof p.sub === 'string' && typeof p['fam'] === 'number' && typeof p['rol'] === 'string';
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

/** RF-01, RF-02, RF-13: registro, autenticación JWT y contraseñas. */
export class AuthService {
  /** Hash ficticio para comparar cuando el correo no existe (evita enumeración por tiempo de respuesta). */
  readonly #hashFicticio: string;

  constructor(
    private readonly cfg: Configuracion,
    private readonly bd: BaseDatos,
    private readonly familias: FamiliaRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly categorias: CategoriaRepository,
  ) {
    this.#hashFicticio = bcrypt.hashSync('usuario-inexistente', cfg.bcryptCosto);
  }

  hashear(password: string): Promise<string> {
    return bcrypt.hash(password, this.cfg.bcryptCosto);
  }

  generarToken(usuario: Usuario): string {
    const payload: Omit<PayloadToken, 'sub'> = { fam: usuario.familiaId, rol: usuario.rol, nombre: usuario.nombre };
    return jwt.sign(payload, this.cfg.jwt.secreto, {
      subject: String(usuario.id),
      expiresIn: this.cfg.jwt.expiraEn as SignOptions['expiresIn'],
      issuer: this.cfg.jwt.emisor,
      algorithm: 'HS256',
    });
  }

  /** Verifica firma, emisor y expiración. Devuelve el payload tipado o lanza 401. */
  verificarToken(token: string): PayloadToken {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, this.cfg.jwt.secreto, { algorithms: ['HS256'], issuer: this.cfg.jwt.emisor });
    } catch (err) {
      throw new NoAutenticadoError(err instanceof jwt.TokenExpiredError ? 'La sesión ha expirado' : 'Token inválido');
    }
    if (!esPayloadToken(payload)) throw new NoAutenticadoError('Token inválido');
    return payload;
  }

  /** RF-01: registra la familia, su administrador y las categorías iniciales en una sola transacción. */
  async registrar({ familia, nombre, email, password }: EntradaRegistro): Promise<Sesion> {
    if (this.usuarios.existeEmail(email)) throw new ConflictoError('El correo ya está registrado');
    const passwordHash = await this.hashear(password);
    const usuario = this.bd.transaccion(() => {
      const fam = this.familias.crear(familia);
      for (const [n, color] of CATEGORIAS_INICIALES) this.categorias.crear(fam.id, { nombre: n, color });
      return this.usuarios.crear({ familiaId: fam.id, nombre, email, passwordHash, rol: Rol.ADMIN });
    });
    return { token: this.generarToken(usuario), usuario };
  }

  /** RF-02: autentica por correo y contraseña y emite un JWT. */
  async login({ email, password }: EntradaLogin): Promise<Sesion> {
    const u = this.usuarios.buscarPorEmailConHash(email);
    const ok = await bcrypt.compare(password, u?.hashContrasena ?? this.#hashFicticio);
    if (!u || !ok) throw new NoAutenticadoError('Correo o contraseña incorrectos');
    if (!u.activo) throw new UsuarioInactivoError();
    return { token: this.generarToken(u), usuario: u };
  }

  perfil(usuarioId: number): PerfilDTO {
    const usuario = this.usuarios.buscarPorId(usuarioId);
    const familia = usuario && this.familias.buscarPorId(usuario.familiaId);
    if (!usuario || !familia) throw new NoEncontradoError('Usuario');
    return { ...usuario.toJSON(), familia: familia.toJSON() };
  }

  /** RF-13: cambio de contraseña verificando la actual. */
  async cambiarPassword(usuarioId: number, { actual, nueva }: EntradaCambioPassword): Promise<void> {
    const hash = this.usuarios.buscarPorIdConHash(usuarioId)?.hashContrasena;
    if (!hash || !(await bcrypt.compare(actual, hash))) {
      throw new ValidacionError('La contraseña actual no es correcta');
    }
    this.usuarios.actualizarPassword(usuarioId, await this.hashear(nueva));
  }
}
