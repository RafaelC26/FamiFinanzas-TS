// Función serverless de Vercel: expone la app Express transpilada por tsc (dist/).
// En Vercel solo /tmp es escribible, así que la base SQLite vive allí y se reinicia
// cuando la plataforma recicla la instancia; al arrancar vacía se cargan los datos demo.
process.env.DB_PATH ??= '/tmp/famifinanzas.db';

const { crearApp } = await import('../dist/src/app.js');
const { sembrarDatosDemo } = await import('../dist/src/db/demo.js');

await sembrarDatosDemo();

export default crearApp();
