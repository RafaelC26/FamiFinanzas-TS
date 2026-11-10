// Carga datos de demostración: npm run seed
import { baseDatos } from './database.js';
import { EMAIL_ADMIN_DEMO, sembrarDatosDemo } from './demo.js';

if (await sembrarDatosDemo()) {
  console.log('Datos de demostración creados:');
  console.log(`  ADMIN   ${EMAIL_ADMIN_DEMO} / Admin123`);
  console.log('  MIEMBRO laura@famifinanzas.co / Laura123');
  console.log('  MIEMBRO sofia@famifinanzas.co / Sofia123');
} else {
  console.log('Los datos de demostración ya existen. Borre data/famifinanzas.db para regenerarlos.');
}
baseDatos.cerrar();
