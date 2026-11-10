import { RepositorioBase } from './RepositorioBase.js';
import { Usuario } from '../dominio/Usuario.js';
import type { Rol } from '../dominio/enums.js';

interface FilaUsuario {
  id: number;
  familia_id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  activo: number;
  creado_en: string;
}

export interface NuevoUsuario {
  familiaId: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}

/** Cambios parciales: `Partial` hace opcionales todos los campos. */
export type CambiosUsuario = Partial<Pick<Usuario, 'nombre' | 'rol' | 'activo'>>;

export class UsuarioRepository extends RepositorioBase<Usuario, FilaUsuario> {
  /** El hash solo se carga cuando se pide explícitamente (login y cambio de contraseña). */
  protected override mapear(u: FilaUsuario, conHash = false): Usuario {
    return new Usuario({
      id: u.id,
      familiaId: u.familia_id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      activo: Boolean(u.activo),
      creadoEn: u.creado_en,
      ...(conHash ? { passwordHash: u.password_hash } : {}),
    });
  }

  private conHash(sql: string, valor: number | string): Usuario | null {
    const f = this.fila(sql, valor);
    return f ? this.mapear(f, true) : null;
  }

  crear({ familiaId, nombre, email, passwordHash, rol }: NuevoUsuario): Usuario {
    const { idInsertado } = this.ejecutar(
      'INSERT INTO usuarios (familia_id, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
      familiaId, nombre, email, passwordHash, rol,
    );
    return this.buscarPorId(idInsertado) as Usuario;
  }

  buscarPorId(id: number): Usuario | null {
    return this.uno('SELECT * FROM usuarios WHERE id = ?', id);
  }

  buscarPorIdConHash(id: number): Usuario | null {
    return this.conHash('SELECT * FROM usuarios WHERE id = ?', id);
  }

  buscarPorEmailConHash(email: string): Usuario | null {
    return this.conHash('SELECT * FROM usuarios WHERE email = ?', email);
  }

  existeEmail(email: string): boolean {
    return Boolean(this.fila('SELECT 1 AS existe FROM usuarios WHERE email = ?', email));
  }

  listarPorFamilia(familiaId: number): Usuario[] {
    return this.varios('SELECT * FROM usuarios WHERE familia_id = ? ORDER BY activo DESC, nombre', familiaId);
  }

  buscarEnFamilia(id: number, familiaId: number): Usuario | null {
    return this.uno('SELECT * FROM usuarios WHERE id = ? AND familia_id = ?', id, familiaId);
  }

  contarAdminsActivos(familiaId: number): number {
    return this.fila<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios WHERE familia_id = ? AND rol = 'ADMIN' AND activo = 1", familiaId)?.n ?? 0;
  }

  actualizar(id: number, { nombre, rol, activo }: CambiosUsuario): Usuario {
    this.ejecutar(
      `UPDATE usuarios SET nombre = COALESCE(?, nombre), rol = COALESCE(?, rol),
       activo = COALESCE(?, activo) WHERE id = ?`,
      nombre ?? null, rol ?? null, activo === undefined ? null : Number(activo), id,
    );
    return this.buscarPorId(id) as Usuario;
  }

  actualizarPassword(id: number, passwordHash: string): void {
    this.ejecutar('UPDATE usuarios SET password_hash = ? WHERE id = ?', passwordHash, id);
  }
}
