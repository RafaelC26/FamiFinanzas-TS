// Comportamientos progresivos del front-end (la app funciona también sin JavaScript).
document.addEventListener('DOMContentLoaded', () => {
  // Confirmación antes de acciones destructivas.
  document.querySelectorAll('form[data-confirmar]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!window.confirm(form.dataset.confirmar)) e.preventDefault();
    });
  });

  // Menú desplegable en pantallas pequeñas.
  const boton = document.querySelector('[data-menu]');
  const menu = document.getElementById('menu');
  boton?.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', String(abierto));
  });

  // Evita el doble envío de formularios.
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (e.defaultPrevented) return;
      form.querySelectorAll('button[type="submit"], button:not([type])').forEach((b) => { b.disabled = true; });
    });
  });
});
