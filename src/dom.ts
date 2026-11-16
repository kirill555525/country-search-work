export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(
  text: string,
  action: () => void,
  className = '',
): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function flag(name: string, url: string): HTMLSpanElement {
  const container = element('span', 'flag');
  const fallback = () =>
    container.replaceChildren(element('span', 'flag-fallback', 'Флаг недоступен'));
  if (!url) fallback();
  else {
    const image = element('img');
    image.src = url;
    image.alt = `Флаг страны ${name}`;
    image.loading = 'lazy';
    image.addEventListener('error', fallback, { once: true });
    container.append(image);
  }
  return container;
}

export function formatNumber(value: number | null): string {
  return value === null ? 'Нет данных' : new Intl.NumberFormat('ru-RU').format(value);
}
