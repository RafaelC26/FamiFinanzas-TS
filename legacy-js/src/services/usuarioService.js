import { usuarioRepository } from '../repositories/usuarioRepository.js';
import { authService } from './authService.js';
import { conflicto, noEncontrado, AppError } from '../utils/errores.js';

/** RF-03: gestión de miembros de la familia (solo administrador). */
export const usuarioService = {
  listar: (actor) => usuarioRepository.listarPorFamilia(actor.familiaId),

  obtener(actor, id) {
    const u = usuarioRepository.buscarEnFamilia(id, actor.familiaId);
    if (!u) throw noEncontrado('Usuario');
    return u;
  },

  async crear(actor, { nombre, email, password, rol }) {
    if (usuarioRepository.existeEmail(email)) throw conflicto('El correo ya está registrado');
    const passwordHash = await authService.hashear(password);
    return usuarioRepository.crear({ familiaId: actor.familiaId, nombre, email, passwordHash, rol });
  },

  actualizar(actor, id, cambios) {
    const u = this.obtener(actor, id);
    const pierdeAdmin = u.rol === 'ADMIN' && u.activo && (cambios.rol === 'MIEMBRO' || cambios.activo === false);
    if (pierdeAdmin && usuarioRepository.contarAdminsActivos(actor.familiaId) <= 1) {
      throw new AppError(409, 'CONFLICTO', 'La familia debe conservar al menos un administrador activo');
    }
    return usuarioRepository.actualizar(id, cambios);
  },

  /** No se borra físicamente para conservar el historial de movimientos: se desactiva. */
  desactivar(actor, id) {
    return this.actualizar(actor, id, { activo: false });
  },
};
