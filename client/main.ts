/**
 * Punto de entrada del frontend (se carga con <script type="module" src="/js/main.js">).
 *
 * La aplicación sigue funcionando sin JavaScript (las vistas EJS hacen todo en
 * el servidor); estos componentes agregan comportamiento encima (mejora progresiva).
 * El orden importa: la validación y la confirmación deben registrarse antes que
 * EnvioUnico, que deshabilita los botones solo si el envío no fue cancelado.
 */
import { montarTodos } from './nucleo/Componente.js';
import { AvisoFlash, ConfirmacionAccion, EnvioUnico, MenuMovil } from './componentes/basicos.js';
import { ValidadorFormulario } from './componentes/ValidadorFormulario.js';
import { VistaPreviaMonto } from './componentes/VistaPreviaMonto.js';
import { SimuladorPresupuesto } from './componentes/SimuladorPresupuesto.js';
import { GraficoCategorias } from './componentes/GraficoCategorias.js';
import { TablaOrdenable } from './componentes/TablaOrdenable.js';

montarTodos('[data-menu]', MenuMovil);
montarTodos('.alerta[role="status"]', AvisoFlash);
montarTodos('form[data-validar]', ValidadorFormulario);
montarTodos('form[data-confirmar]', ConfirmacionAccion);
montarTodos('form', EnvioUnico);
montarTodos('input[data-moneda]', VistaPreviaMonto);
montarTodos('form[data-simulador]', SimuladorPresupuesto);
montarTodos('canvas[data-grafico]', GraficoCategorias);
montarTodos('table[data-ordenable]', TablaOrdenable);
