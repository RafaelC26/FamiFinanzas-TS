// Configuración centralizada: todo se toma de variables de entorno (RNF-08 Portabilidad).

export type Entorno = 'development' | 'production' | 'test';

/** Interfaz de la configuración: todas las propiedades son de solo lectura. */
export interface Configuracion {
  readonly entorno: Entorno;
  readonly puerto: number;
  readonly dbPath: string;
  readonly jwt: {
    readonly secreto: string;
    readonly expiraEn: string;
    readonly emisor: string;
  };
  readonly bcryptCosto: number;
  readonly loginLimite: {
    readonly ventanaMs: number;
    readonly maxIntentos: number;
  };
  /** Fracción del presupuesto a partir de la cual se alerta (0.8 = 80 %). */
  readonly umbralAlerta: number;
}

const ENTORNOS: readonly Entorno[] = ['development', 'production', 'test'];

/** Type guard: convierte un string cualquiera en un Entorno válido. */
function esEntorno(valor: string | undefined): valor is Entorno {
  return ENTORNOS.includes(valor as Entorno);
}

const entorno: Entorno = esEntorno(process.env['NODE_ENV']) ? process.env['NODE_ENV'] : 'development';

if (entorno === 'production' && !process.env['JWT_SECRET']) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

export const config: Configuracion = Object.freeze({
  entorno,
  puerto: Number(process.env['PORT']) || 3000,
  dbPath: process.env['DB_PATH'] || (entorno === 'test' ? ':memory:' : 'data/famifinanzas.db'),
  jwt: {
    secreto: process.env['JWT_SECRET'] || 'dev-secreto-cambiar-en-produccion-9f2c1a',
    expiraEn: process.env['JWT_EXPIRES_IN'] || '2h',
    emisor: 'famifinanzas',
  },
  bcryptCosto: entorno === 'test' ? 4 : 10,
  loginLimite: {
    ventanaMs: 15 * 60 * 1000,
    maxIntentos: Number(process.env['LOGIN_MAX_INTENTOS']) || 10,
  },
  umbralAlerta: 0.8,
});
