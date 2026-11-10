/**
 * Raíz de composición (inyección de dependencias manual).
 *
 * Aquí, y solo aquí, se crean las instancias y se conectan entre sí. Cada clase
 * recibe sus dependencias por el constructor, tipadas con su clase/interfaz,
 * lo que facilita las pruebas y elimina los imports circulares entre servicios
 * que tenía la versión JS.
 */
import { config } from './config.js';
import { baseDatos } from './db/database.js';
import { FamiliaRepository } from './repositories/FamiliaRepository.js';
import { UsuarioRepository } from './repositories/UsuarioRepository.js';
import { CategoriaRepository } from './repositories/CategoriaRepository.js';
import { GastoRepository } from './repositories/GastoRepository.js';
import { IngresoRepository } from './repositories/IngresoRepository.js';
import { PresupuestoRepository } from './repositories/PresupuestoRepository.js';
import { ReporteRepository } from './repositories/ReporteRepository.js';
import { AuthService } from './services/AuthService.js';
import { UsuarioService } from './services/UsuarioService.js';
import { CategoriaService } from './services/CategoriaService.js';
import { GastoService } from './services/GastoService.js';
import { IngresoService } from './services/IngresoService.js';
import { PresupuestoService } from './services/PresupuestoService.js';
import { ReporteService } from './services/ReporteService.js';

// Repositorios (acceso a datos)
export const familiaRepository = new FamiliaRepository(baseDatos);
export const usuarioRepository = new UsuarioRepository(baseDatos);
export const categoriaRepository = new CategoriaRepository(baseDatos);
export const gastoRepository = new GastoRepository(baseDatos);
export const ingresoRepository = new IngresoRepository(baseDatos);
export const presupuestoRepository = new PresupuestoRepository(baseDatos);
export const reporteRepository = new ReporteRepository(baseDatos);

// Servicios (reglas de negocio)
export const authService = new AuthService(config, baseDatos, familiaRepository, usuarioRepository, categoriaRepository);
export const usuarioService = new UsuarioService(usuarioRepository, authService);
export const categoriaService = new CategoriaService(categoriaRepository);
export const presupuestoService = new PresupuestoService(config, presupuestoRepository, gastoRepository, categoriaService);
export const gastoService = new GastoService(gastoRepository, categoriaService, presupuestoService);
export const ingresoService = new IngresoService(ingresoRepository);
export const reporteService = new ReporteService(config, reporteRepository);
