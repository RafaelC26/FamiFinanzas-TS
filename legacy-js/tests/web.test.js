// Pruebas del front-end EJS (renderizado y sesión con cookie JWT).
import { test } from 'node:test';
import assert from 'node:assert/strict';

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
  const cookie = r.headers['set-cookie'].find((c) => c.startsWith('ff_token='));
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
