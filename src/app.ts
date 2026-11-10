import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { apiRouter } from './routes/api/index.js';
import { webRouter } from './routes/web.js';
import { manejadorErroresApi, noEncontradoApi } from './middlewares/errores.js';
import { especificacionOpenApi } from './docs/swagger.js';
import { rutaProyecto } from './utils/rutas.js';

export function crearApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', rutaProyecto('views'));

  // Seguridad: cabeceras HTTP (CSP, HSTS, X-Frame-Options, etc.).
  app.use(helmet());
  if (config.entorno !== 'test') app.use(morgan(config.entorno === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  // public/js contiene el JavaScript generado desde client/*.ts (npm run build:client).
  app.use(express.static(rutaProyecto('public'), { maxAge: config.entorno === 'production' ? '1d' : 0 }));

  // Documentación Swagger (OpenAPI 3). Swagger UI usa estilos/scripts inline: CSP relajada solo en esta ruta.
  app.get('/api-docs.json', (_req, res) => {
    res.json(especificacionOpenApi);
  });
  app.use(
    '/api-docs',
    helmet.contentSecurityPolicy({
      directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'script-src': ["'self'", "'unsafe-inline'"] },
    }),
    swaggerUi.serve,
    swaggerUi.setup(especificacionOpenApi, { customSiteTitle: 'FamiFinanzas API', swaggerOptions: { persistAuthorization: true } }),
  );

  app.use('/api/v1', apiRouter, noEncontradoApi, manejadorErroresApi);
  app.use('/', webRouter);

  return app;
}
