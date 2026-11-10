// Mide el RNF-05 (rendimiento): p95 de las operaciones principales con 10.000 gastos.
// Uso: npm run bench   (usa una base de datos en memoria; no toca los datos reales)
process.env.NODE_ENV = 'test';
process.env.LOGIN_MAX_INTENTOS = '1000';
const { default: request } = await import('supertest');
const { crearApp } = await import('../src/app.js');
const { db } = await import('../src/db/database.js');

const app = crearApp();
const { body: sesion } = await request(app).post('/api/v1/auth/registro')
  .send({ familia: 'Benchmark', nombre: 'Bench', email: 'bench@test.co', password: 'Clave1234' });
const auth = { Authorization: `Bearer ${sesion.token}` };
const familiaId = sesion.usuario.familiaId;

const N = 10_000;
const insertar = db.prepare('INSERT INTO gastos (familia_id, usuario_id, categoria_id, monto, fecha, descripcion, metodo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)');
db.exec('BEGIN');
for (let i = 0; i < N; i++) {
  const fecha = new Date(Date.UTC(2025, 0, 1) + (i % 600) * 86_400_000).toISOString().slice(0, 10);
  insertar.run(familiaId, sesion.usuario.id, (i % 8) + 1, 1000 + (i % 500) * 100, fecha, `Gasto ${i}`, 'EFECTIVO');
}
db.exec('COMMIT');

async function medir(nombre, fn, repeticiones = 200) {
  const tiempos = [];
  for (let i = 0; i < repeticiones; i++) {
    const t0 = performance.now();
    const r = await fn();
    tiempos.push(performance.now() - t0);
    if (r.status >= 400) throw new Error(`${nombre}: HTTP ${r.status}`);
  }
  tiempos.sort((a, b) => a - b);
  const p = (q) => tiempos[Math.floor(q * (tiempos.length - 1))].toFixed(2);
  return { operación: nombre, 'p50 (ms)': p(0.5), 'p95 (ms)': p(0.95), 'máx (ms)': p(1) };
}

const resultados = [
  await medir('GET /gastos (página 1)', () => request(app).get('/api/v1/gastos').set(auth)),
  await medir('GET /gastos (filtro fechas + categoría)', () => request(app).get('/api/v1/gastos?desde=2025-03-01&hasta=2025-06-30&categoriaId=2').set(auth)),
  await medir('POST /gastos', () => request(app).post('/api/v1/gastos').set(auth).send({ monto: 1000, fecha: '2025-05-05', categoriaId: 1, metodoPago: 'EFECTIVO' })),
  await medir('GET /reportes/resumen', () => request(app).get('/api/v1/reportes/resumen?mes=2025-05').set(auth)),
  await medir('GET /gastos/exportar (todo)', () => request(app).get('/api/v1/gastos/exportar').set(auth), 20),
];

console.log(`\nRNF-05 — ${N.toLocaleString('es-CO')} gastos en la base de datos\n`);
console.table(resultados);
const crud = resultados.slice(0, 4);
const cumple = crud.every((r) => Number(r['p95 (ms)']) < 300);
console.log(cumple ? '✔ Cumple: p95 < 300 ms en operaciones CRUD y reportes' : '✖ No cumple el objetivo de 300 ms');
process.exit(cumple ? 0 : 1);
