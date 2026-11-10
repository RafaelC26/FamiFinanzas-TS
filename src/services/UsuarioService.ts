import type { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import type { AuthService } from './AuthService.js';
import type { Actor } from '../dominio/interfaces.js';
import { Rol } from '../dominio/enums.js';
import type { Usuario } from '../dominio/Usuario.js';
import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import type { EntradaUsuarioEdicion, EntradaUsuarioNuevo } from '../utils/validacion.js';

/** RF-03: gestión de miembros de la familia (solo administrador). */
export class UsuarioService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly auth: AuthService,
  ) {}

  listar(actor: Actor): Usuario[] {
    return this.usuarios.listarPorFamilia(actor.familiaId);
  }

  obtener(actor: Actor, id: number): Usuario {
    const u = this.usuarios.buscarEnFamilia(id, actor.familiaId);
    if (!u) throw new NoEncontradoError('Usuario');
    return u;
  }

  async crear(actor: Actor, { nombre, email, password, rol }: EntradaUsuarioNuevo): Promise<Usuario> {
    if (this.usuarios.existeEmail(email)) throw new ConflictoError('El correo ya está registrado');
    const passwordHash = await this.auth.hashear(password);
    return this.usuarios.crear({ familiaId: actor.familiaId, nombre, email, passwordHash, rol });
  }

  actualizar(actor: Actor, id: number, cambios: EntradaUsuarioEdicion): Usuario {
    const u = this.obtener(actor, id);
    const pierdeAdmin = u.esAdmin() && u.activo && (cambios.rol === Rol.MIEMBRO || cambios.activo === false);
    if (pierdeAdmin && this.usuarios.contarAdminsActivos(actor.familiaId) <= 1) {
      throw new ConflictoError('La familia debe conservar al menos un administrador activo');
    }
    return this.usuarios.actualizar(id, cambios);
  }

  /** No se borra físicamente para conservar el historial de movimientos: se desactiva. */
  desactivar(actor: Actor, id: number): Usuario {
    return this.actualizar(actor, id, { activo: false });
  }
}
