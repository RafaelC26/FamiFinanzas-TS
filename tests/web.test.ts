// Pruebas del front-end EJS (renderizado y sesión con cookie JWT).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ResumenMensualDTO } from '../src/shared/contratos.js';

process.env.NODE_ENV = 'test';
const { default: request } = await import('supertest');
const { crearApp } = await import('../src/app.js');

const app = crearApp();

test('sin sesión redirige al login', async () => {
  const r = await request(app).get('/dashboard');
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, '/login');
});

test('registro y navegación con cookie JWT httpOnly', async () => {
  const agente = request.agent(app);
  const r = await agente.post('/registro').type('form').send({ familia: 'Familia Web', nombre: 'Ana Web', email: 'ana@web.co', password: 'Clave1234' });
  assert.equal(r.status, 302);
  const cookies = r.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((c) => c.startsWith('ff_token='));
  assert.ok(cookie);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  for (const ruta of ['/dashboard', '/gastos', '/ingresos', '/presupuestos', '/categorias', '/miembros', '/perfil', '/api-docs/']) {
    const p = await agente.get(ruta);
    assert.equal(p.status, 200, ruta);
  }

  const alta = await agente.post('/gastos').type('form').send({ monto: '45000', fecha: '2026-10-05', categoriaId: '1', metodoPago: 'EFECTIVO', descripcion: 'Prueba <script>' });
  assert.equal(alta.status, 302);
  const lista = await agente.get('/gastos');
  assert.match(lista.text, /Prueba &lt;script&gt;/, 'escapa HTML (XSS)');
});

test('credenciales incorrectas muestran el error en la página', async () => {
  const r = await request(app).post('/login').type('form').send({ email: 'nadie@web.co', password: 'x' });
  assert.equal(r.status, 401);
  assert.match(r.text, /Correo o contraseña incorrectos/);
});

test('endpoints JSON del frontend TS usan la cookie de sesión y cumplen el contrato', async () => {
  const agente = request.agent(app);
  await agente.post('/registro').type('form').send({ familia: 'Familia Front', nombre: 'Leo Front', email: 'leo@web.co', password: 'Clave1234' });
  const mes = new Date().toISOString().slice(0, 7);
  await agente.post('/gastos').type('form').send({ monto: '1000', fecha: `${mes}-02`, categoriaId: '9', metodoPago: 'EFECTIVO', descripcion: '</script><b>x' });

  const resumen = await agente.get('/datos/resumen').query({ mes });
  assert.equal(resumen.status, 200);
  assert.match(resumen.headers['content-type'] ?? '', /application\/json/);
  const cuerpo = resumen.body as ResumenMensualDTO;
  assert.equal(cuerpo.mes, mes);
  assert.ok(Array.isArray(cuerpo.porCategoria));

  const presupuestos = await agente.get('/datos/presupuestos').query({ mes });
  assert.equal(presupuestos.status, 200);
  assert.ok(Array.isArray(presupuestos.body));

  const dashboard = await agente.get('/dashboard');
  assert.match(dashboard.text, /<script type="module" src="\/js\/main\.js">/);
  assert.match(dashboard.text, /id="datos-resumen"/);
  const isla = /id="datos-resumen">([\s\S]*?)<\/script>/.exec(dashboard.text)?.[1] ?? '';
  assert.doesNotMatch(isla, /</, 'el JSON incrustado no contiene "<" sin escapar');

  const sinSesion = await request(app).get('/datos/resumen');
  assert.equal(sinSesion.status, 302, 'sin cookie redirige al login');
});
