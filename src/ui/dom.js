// Helpers mínimos de DOM.

/** Cria um elemento a partir de HTML. Use `esc()` em qualquer texto vindo do jogador. */
export function html(markup) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild;
}

export function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Liga cliques em elementos [data-action] a um mapa de handlers. */
export function bindActions(root, handlers) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (fn) fn(el, e);
  });
}

export const formatNumber = (n) => Number(n).toLocaleString('pt-BR');
