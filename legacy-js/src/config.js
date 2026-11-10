// Configuración centralizada: todo se toma de variables de entorno (RNF-08 Portabilidad).
const entorno = process.env.NODE_ENV || 'development';

if (entorno === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

export const config = {
  entorno,
  puerto: Number(process.env.PORT) || 3000,
  dbPath: process.env.DB_PATH || (entorno === 'test' ? ':memory:' : 'data/famifinanzas.db'),
  jwt: {
    secreto: process.env.JWT_SECRET || 'dev-secreto-cambiar-en-produccion-9f2c1a',
    expiraEn: process.env.JWT_EXPIRES_IN || '2h',
    emisor: 'famifinanzas',
  },
  bcryptCosto: entorno === 'test' ? 4 : 10,
  loginLimite: {
    ventanaMs: 15 * 60 * 1000,
    maxIntentos: Number(process.env.LOGIN_MAX_INTENTOS) || 10,
  },
  umbralAlerta: 0.8, // 80 % del presupuesto
};
