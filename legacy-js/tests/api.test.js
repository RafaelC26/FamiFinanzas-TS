// Pruebas de integración de la API REST (base de datos SQLite en memoria).
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.LOGIN_MAX_INTENTOS = '5';
const { default: request } = await import('supertest');
const { default: jwt } = await import('jsonwebtoken');
const { crearApp } = await import('../src/app.js');
const { config } = await import('../src/config.js');

const app = crearApp();
const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const mes = new Date().toISOString().slice(0, 7);
const fecha = `${mes}-10`;

let admin, miembro, otraFamilia, categoriaId;

async function registrar(sufijo) {
  const r = await api().post('/api/v1/auth/registro').send({ familia: `Familia ${sufijo}`, nombre: `Admin ${sufijo}`, email: `admin.${sufijo}@test.co`, password: 'Clave1234' });
  assert.equal(r.status, 201);
  return r.body;
}

before(async () => {
  admin = await registrar('a');
  otraFamilia = await registrar('b');
  await api().post('/api/v1/usuarios').set(auth(admin.token)).send({ nombre: 'Miembro A', email: 'miembro.a@test.co', password: 'Miembro123' });
  miembro = (await api().post('/api/v1/auth/login').send({ email: 'miembro.a@test.co', password: 'Miembro123' })).body;
  categoriaId = (await api().get('/api/v1/categorias').set(auth(admin.token))).body[0].id;
});

describe('RF-01/RF-02 Registro y autenticación', () => {
  test('el registro crea admin, token JWT y 8 categorías iniciales', async () => {
    assert.equal(admin.usuario.rol, 'ADMIN');
    assert.equal(admin.usuario.passwordHash, undefined, 'nunca expone el hash');
    const payload = jwt.decode(admin.token);
    assert.equal(payload.rol, 'ADMIN');
    assert.equal(payload.iss, 'famifinanzas');
    const cats = await api().get('/api/v1/categorias').set(auth(admin.token));
    assert.equal(cats.body.length, 8);
  });

  test('no permite correos duplicados (409)', async () => {
    const r = await api().post('/api/v1/auth/registro').send({ familia: 'XX', nombre: 'Otro', email: 'ADMIN.A@test.co', password: 'Clave1234' });
    assert.equal(r.status, 409);
  });

  test('valida la política de contraseñas (400)', async () => {
    const r = await api().post('/api/v1/auth/registro').send({ familia: 'X', nombre: 'Otro', email: 'nuevo@test.co', password: 'corta' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.codigo, 'VALIDACION');
  });

  test('login exitoso devuelve token y perfil', async () => {
    const r = await api().post('/api/v1/auth/login').send({ email: 'admin.a@test.co', password: 'Clave1234' });
    assert.equal(r.status, 200);
    assert.ok(r.body.token);
    const perfil = await api().get('/api/v1/auth/perfil').set(auth(r.body.token));
    assert.equal(perfil.body.familia.nombre, 'Familia a');
  });
});

describe('RNF-01 Seguridad: JWT', () => {
  const protegidas = ['/auth/perfil', '/usuarios', '/categorias', '/gastos', '/ingresos', '/presupuestos', '/reportes/resumen', '/gastos/exportar'];

  test('todas las rutas protegidas responden 401 sin token', async () => {
    for (const ruta of protegidas) {
      const r = await api().get(`/api/v1${ruta}`);
      assert.equal(r.status, 401, ruta);
      assert.equal(r.body.error.codigo, 'NO_AUTENTICADO');
    }
  });

  test('rechaza token con firma alterada', async () => {
    const falso = jwt.sign({ fam: 1, rol: 'ADMIN' }, 'otro-secreto', { subject: '1', issuer: 'famifinanzas' });
    assert.equal((await api().get('/api/v1/gastos').set(auth(falso))).status, 401);
  });

  test('rechaza token expirado', async () => {
    const viejo = jwt.sign({ fam: 1, rol: 'ADMIN' }, config.jwt.secreto, { subject: '1', issuer: 'famifinanzas', expiresIn: -10 });
    const r = await api().get('/api/v1/gastos').set(auth(viejo));
    assert.equal(r.status, 401);
    assert.match(r.body.error.mensaje, /expirado/);
  });

  test('rechaza el algoritmo "none"', async () => {
    const sinFirma = jwt.sign({ fam: 1, rol: 'ADMIN' }, null, { algorithm: 'none', subject: '1', issuer: 'famifinanzas' });
    assert.equal((await api().get('/api/v1/gastos').set(auth(sinFirma))).status, 401);
  });

  test('aplica cabeceras de seguridad (helmet)', async () => {
    const r = await api().get('/api/v1/health');
    assert.ok(r.headers['content-security-policy']);
    assert.equal(r.headers['x-powered-by'], undefined);
  });
});

describe('RF-14 Autorización por rol y aislamiento entre familias', () => {
  test('un MIEMBRO no puede crear categorías, presupuestos ni miembros (403)', async () => {
    const t = auth(miembro.token);
    assert.equal((await api().post('/api/v1/categorias').set(t).send({ nombre: 'Prohibida' })).status, 403);
    assert.equal((await api().post('/api/v1/presupuestos').set(t).send({ categoriaId, mes, montoLimite: 10 })).status, 403);
    assert.equal((await api().post('/api/v1/usuarios').set(t).send({ nombre: 'X', email: 'x@test.co', password: 'Clave1234' })).status, 403);
  });

  test('una familia no puede ver los gastos de otra (404)', async () => {
    const g = await api().post('/api/v1/gastos').set(auth(admin.token)).send({ monto: 1000, fecha, categoriaId, metodoPago: 'EFECTIVO' });
    const r = await api().get(`/api/v1/gastos/${g.body.gasto.id}`).set(auth(otraFamilia.token));
    assert.equal(r.status, 404);
    const lista = await api().get('/api/v1/gastos').set(auth(otraFamilia.token));
    assert.equal(lista.body.paginacion.total, 0);
  });

  test('una familia no puede usar categorías de otra', async () => {
    const r = await api().post('/api/v1/gastos').set(auth(otraFamilia.token)).send({ monto: 1000, fecha, categoriaId, metodoPago: 'EFECTIVO' });
    assert.equal(r.status, 404);
  });
});

describe('RF-05/06/07 Gastos', () => {
  test('CRUD completo de un gasto', async () => {
    const t = auth(miembro.token);
    const creado = await api().post('/api/v1/gastos').set(t).send({ monto: 25000, fecha, categoriaId, descripcion: 'Pan', metodoPago: 'EFECTIVO' });
    assert.equal(creado.status, 201);
    const id = creado.body.gasto.id;
    assert.equal(creado.body.gasto.usuario.nombre, 'Miembro A');

    const editado = await api().put(`/api/v1/gastos/${id}`).set(t).send({ monto: 30000, fecha, categoriaId, descripcion: 'Pan y leche', metodoPago: 'TARJETA_DEBITO' });
    assert.equal(editado.status, 200);
    assert.equal(editado.body.gasto.monto, 30000);

    assert.equal((await api().delete(`/api/v1/gastos/${id}`).set(t)).status, 204);
    assert.equal((await api().get(`/api/v1/gastos/${id}`).set(t)).status, 404);
  });

  test('valida monto, fecha y método de pago', async () => {
    const r = await api().post('/api/v1/gastos').set(auth(admin.token)).send({ monto: 0, fecha: '2026-02-30x', categoriaId, metodoPago: 'BITCOIN' });
    assert.equal(r.status, 400);
    assert.ok(r.body.error.detalles.length >= 3);
  });

  test('un MIEMBRO no puede modificar gastos de otro, el ADMIN sí', async () => {
    const g = await api().post('/api/v1/gastos').set(auth(admin.token)).send({ monto: 5000, fecha, categoriaId, metodoPago: 'EFECTIVO' });
    const id = g.body.gasto.id;
    assert.equal((await api().delete(`/api/v1/gastos/${id}`).set(auth(miembro.token))).status, 403);

    const delMiembro = await api().post('/api/v1/gastos').set(auth(miembro.token)).send({ monto: 5000, fecha, categoriaId, metodoPago: 'EFECTIVO' });
    assert.equal((await api().delete(`/api/v1/gastos/${delMiembro.body.gasto.id}`).set(auth(admin.token))).status, 204);
  });

  test('filtra por rango de fechas, categoría y miembro con paginación', async () => {
    const t = auth(admin.token);
    for (let i = 1; i <= 3; i++) await api().post('/api/v1/gastos').set(t).send({ monto: 100 * i, fecha: '2025-01-0' + i, categoriaId, metodoPago: 'EFECTIVO' });
    const r = await api().get('/api/v1/gastos').query({ desde: '2025-01-01', hasta: '2025-01-02', categoriaId, usuarioId: admin.usuario.id, limite: 1 }).set(t);
    assert.equal(r.status, 200);
    assert.equal(r.body.paginacion.total, 2);
    assert.equal(r.body.paginacion.paginas, 2);
    assert.equal(r.body.datos.length, 1);
    assert.equal(r.body.suma, 300);
  });

  test('RF-12 exporta CSV', async () => {
    const r = await api().get('/api/v1/gastos/exportar').query({ desde: '2025-01-01', hasta: '2025-01-31' }).set(auth(admin.token));
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /text\/csv/);
    assert.match(r.headers['content-disposition'], /gastos\.csv/);
    assert.equal(r.text.trim().split('\r\n').length, 4); // encabezado + 3 filas
  });
});

describe('RF-09/RF-10 Presupuestos y alertas', () => {
  test('alerta al llegar al 80 % y al exceder el presupuesto', async () => {
    const t = auth(otraFamilia.token);
    const cat = (await api().post('/api/v1/categorias').set(t).send({ nombre: 'Mascotas', color: '#f97316' })).body;
    const p = await api().post('/api/v1/presupuestos').set(t).send({ categoriaId: cat.id, mes, montoLimite: 100000 });
    assert.equal(p.status, 201);
    assert.equal((await api().post('/api/v1/presupuestos').set(t).send({ categoriaId: cat.id, mes, montoLimite: 1 })).status, 409);

    const g1 = await api().post('/api/v1/gastos').set(t).send({ monto: 50000, fecha, categoriaId: cat.id, metodoPago: 'EFECTIVO' });
    assert.equal(g1.body.alerta, null);
    const g2 = await api().post('/api/v1/gastos').set(t).send({ monto: 35000, fecha, categoriaId: cat.id, metodoPago: 'EFECTIVO' });
    assert.equal(g2.body.alerta.estado, 'ALERTA');
    assert.equal(g2.body.alerta.porcentaje, 85);
    const g3 = await api().post('/api/v1/gastos').set(t).send({ monto: 20000, fecha, categoriaId: cat.id, metodoPago: 'EFECTIVO' });
    assert.equal(g3.body.alerta.estado, 'EXCEDIDO');

    const lista = await api().get('/api/v1/presupuestos').query({ mes }).set(t);
    assert.equal(lista.body[0].gastado, 105000);
    assert.equal(lista.body[0].estado, 'EXCEDIDO');
  });
});

describe('RF-08/RF-11 Ingresos y resumen mensual', () => {
  test('el resumen calcula totales, balance y distribución', async () => {
    const t = auth(otraFamilia.token);
    const ing = await api().post('/api/v1/ingresos').set(t).send({ monto: 500000, fecha, fuente: 'Salario' });
    assert.equal(ing.status, 201);
    const r = await api().get('/api/v1/reportes/resumen').query({ mes }).set(t);
    assert.equal(r.status, 200);
    assert.equal(r.body.totalIngresos, 500000);
    assert.equal(r.body.totalGastos, 105000);
    assert.equal(r.body.balance, 395000);
    assert.equal(r.body.porCategoria[0].participacion, 100);
    assert.equal(r.body.alertas.length, 1);
    assert.equal(r.body.porMiembro[0].total, 105000);
  });

  test('valida el formato del mes', async () => {
    const r = await api().get('/api/v1/reportes/resumen').query({ mes: '2026-13' }).set(auth(admin.token));
    assert.equal(r.status, 400);
  });
});

describe('RF-03/RF-04 Miembros y categorías', () => {
  test('una categoría con gastos se desactiva en lugar de borrarse', async () => {
    const t = auth(admin.token);
    const libre = (await api().post('/api/v1/categorias').set(t).send({ nombre: 'Temporal' })).body;
    assert.equal((await api().delete(`/api/v1/categorias/${libre.id}`).set(t)).body.resultado, 'ELIMINADA');
    assert.equal((await api().delete(`/api/v1/categorias/${categoriaId}`).set(t)).body.resultado, 'DESACTIVADA');
    const r = await api().post('/api/v1/gastos').set(t).send({ monto: 1, fecha, categoriaId, metodoPago: 'EFECTIVO' });
    assert.equal(r.status, 404, 'no se registran gastos en categorías inactivas');
  });

  test('la familia conserva al menos un administrador', async () => {
    const r = await api().put(`/api/v1/usuarios/${admin.usuario.id}`).set(auth(admin.token)).send({ rol: 'MIEMBRO' });
    assert.equal(r.status, 409);
  });

  test('un miembro desactivado pierde el acceso inmediatamente', async () => {
    const t = auth(admin.token);
    const u = (await api().post('/api/v1/usuarios').set(t).send({ nombre: 'Temporal', email: 'temp@test.co', password: 'Temp12345' })).body;
    const sesion = (await api().post('/api/v1/auth/login').send({ email: 'temp@test.co', password: 'Temp12345' })).body;
    assert.equal((await api().delete(`/api/v1/usuarios/${u.id}`).set(t)).body.activo, false);
    assert.equal((await api().get('/api/v1/gastos').set(auth(sesion.token))).status, 401);
    assert.equal((await api().post('/api/v1/auth/login').send({ email: 'temp@test.co', password: 'Temp12345' })).status, 403);
  });

  test('RF-13 cambio de contraseña', async () => {
    const t = auth(miembro.token);
    assert.equal((await api().put('/api/v1/auth/password').set(t).send({ actual: 'incorrecta', nueva: 'Nueva12345' })).status, 400);
    assert.equal((await api().put('/api/v1/auth/password').set(t).send({ actual: 'Miembro123', nueva: 'Nueva12345' })).status, 204);
    assert.equal((await api().post('/api/v1/auth/login').send({ email: 'miembro.a@test.co', password: 'Nueva12345' })).status, 200);
  });
});

describe('RNF-04 Protección contra fuerza bruta', () => {
  test('bloquea el login tras 5 intentos fallidos (429)', async () => {
    // Solo cuentan los intentos fallidos; en este proceso ya hubo uno (usuario desactivado, 403).
    const intentos = [];
    for (let i = 0; i < 5; i++) intentos.push((await api().post('/api/v1/auth/login').send({ email: 'admin.a@test.co', password: 'mala' })).status);
    assert.deepEqual(intentos, [401, 401, 401, 401, 429]);
    const bloqueado = await api().post('/api/v1/auth/login').send({ email: 'admin.a@test.co', password: 'Clave1234' });
    assert.equal(bloqueado.status, 429, 'ni siquiera la contraseña correcta pasa durante el bloqueo');
  });
});

describe('Errores uniformes', () => {
  test('JSON malformado y rutas inexistentes', async () => {
    const r = await api().post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{malo');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.codigo, 'JSON_INVALIDO');
    assert.equal((await api().get('/api/v1/no-existe').set(auth(admin.token))).status, 404);
  });
});
