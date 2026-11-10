import { crearApp } from './app.js';
import { config } from './config.js';

crearApp().listen(config.puerto, () => {
  console.log(`FamiFinanzas (TypeScript) escuchando en http://localhost:${config.puerto}`);
  console.log(`Documentación de la API: http://localhost:${config.puerto}/api-docs`);
});
