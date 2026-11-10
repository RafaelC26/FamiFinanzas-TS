import { Entidad } from './Entidad.js';
import { Rol } from './enums.js';
import type { Actor } from './interfaces.js';
import type { UsuarioDTO } from '../shared/contratos.js';

export interface DatosUsuario {
  id: number;
  familiaId: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  passwordHash?: string;
}

/**
 * Persona que inicia sesión. Implementa `Actor`, la interfaz que los servicios
 * usan para aplicar permisos y el aislamiento por familia.
 *
 * El hash de la contraseña es un campo privado de ECMAScript (#passwordHash):
 * no aparece en JSON.stringify, en el spread {...usuario} ni en Object.keys.
 * En la versión JS esto dependía de "acordarse" de borrarlo con sinHash().
 */
export class Usuario extends Entidad<UsuarioDTO> implements Actor {
  readonly familiaId: number;
  readonly nombre: string;
  readonly email: string;
  readonly rol: Rol;
  readonly activo: boolean;
  readonly creadoEn: string;
  readonly #passwordHash: string | undefined;

  constructor(datos: DatosUsuario) {
    super(datos.id);
    this.familiaId = datos.familiaId;
    this.nombre = datos.nombre;
    this.email = datos.email;
    this.rol = datos.rol;
    this.activo = datos.activo;
    this.creadoEn = datos.creadoEn;
    this.#passwordHash = datos.passwordHash;
  }

  /** Solo el servicio de autenticación lo necesita para comparar con bcrypt. */
  get hashContrasena(): string | undefined {
    return this.#passwordHash;
  }

  esAdmin(): boolean {
    return this.rol === Rol.ADMIN;
  }

  get primerNombre(): string {
    return this.nombre.split(' ')[0] ?? this.nombre;
  }

  override toJSON(): UsuarioDTO {
    return {
      id: this.id,
      familiaId: this.familiaId,
      nombre: this.nombre,
      email: this.email,
      rol: this.rol,
      activo: this.activo,
      creadoEn: this.creadoEn,
    };
  }
}
