/**
 * Ampliación de módulo (module augmentation): agrega la propiedad `usuario`
 * al Request de Express. En JS `req.usuario` existía "por convención"; aquí el
 * compilador conoce su tipo en todas las rutas.
 */
import type { Usuario } from '../dominio/Usuario.js';

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

export {};
