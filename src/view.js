import { button, element, flag, formatNumber } from './dom.js';
import { createDetails } from './details.js';
export function createSearchView(actions) {
    const root = element('main', 'shell');
    const header = element('header', 'topbar');
    const brand = element('a', 'brand', '◎  Country Search');
    brand.href = './';
    header.append(brand, element('span', 'topbar-note', 'Ваш маленький атлас'));
    const hero = element('section', 'hero');
    const intro = element('div', 'hero-copy');
    const title = element('h1');
    title.append(element('span', '', 'Найдите страну.'), element('span', 'accent', 'Откройте больше.'));
    intro.append(element('p', 'eyebrow', 'МИР В ДЕТАЛЯХ'), title, element('p', 'intro', 'От знакомых столиц до далёких островов. Узнайте чуть больше о месте, которое вас интересует.'));
    const globe = element('div', 'globe');
    globe.setAttribute('aria-hidden', 'true');
    globe.append(element('span', 'globe-ring'), element('span', 'globe-dot'));
    hero.append(intro, globe);
    const form = element('form', 'search-panel');
    const label = element('label', 'search-label', 'Название страны');
    label.htmlFor = 'country-query';
    const inputRow = element('div', 'input-row');
    const searchSymbol = element('span', 'search-symbol', '⌕');
    searchSymbol.setAttribute('aria-hidden', 'true');
    const input = element('input');
    input.id = 'country-query';
    input.name = 'query';
    input.type = 'search';
    input.placeholder = 'Например, Finland';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-describedby', 'search-help');
    const clear = button('Очистить', () => {
        input.value = '';
        actions.onQuery('');
        input.focus();
    }, 'clear-button');
    clear.hidden = true;
    inputRow.append(searchSymbol, input, clear);
    const help = element('p', 'search-help', 'Введите название на английском. Результаты появятся автоматически.');
    help.id = 'search-help';
    form.append(label, inputRow, help);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        actions.onQuery(input.value, true);
    });
    input.addEventListener('input', () => actions.onQuery(input.value));
    function choose(query) {
        input.value = query;
        actions.onQuery(query, true);
        input.focus();
    }
    const examples = element('div', 'examples');
    examples.append(element('span', '', 'Попробуйте:'));
    for (const name of ['Finland', 'Japan', 'Canada'])
        examples.append(button(name, () => choose(name), 'chip'));
    form.append(examples);
    const history = element('section', 'history');
    history.setAttribute('aria-label', 'История поиска');
    const summary = element('p', 'results-summary');
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    summary.setAttribute('aria-atomic', 'true');
    const results = element('section', 'results');
    results.setAttribute('aria-label', 'Результаты поиска');
    const footer = element('footer', 'footer');
    const source = element('a', '', 'countries.dev');
    source.href = 'https://countries.dev';
    source.target = '_blank';
    source.rel = 'noreferrer';
    footer.append(element('span', '', 'Мир начинается с любопытства.'), element('span', '', 'Данные: '));
    footer.lastElementChild?.append(source);
    root.append(header, hero, form, history, summary, results, footer);
    document.body.append(root);
    const details = createDetails();
    function panel(symbol, heading, description, className = '') {
        const box = element('div', `state-panel ${className}`);
        const icon = element('span', 'state-icon', symbol);
        icon.setAttribute('aria-hidden', 'true');
        box.append(icon, element('h2', '', heading), element('p', '', description));
        return box;
    }
    function card(country) {
        const item = element('li');
        const open = button('', () => details.open(country), 'country-card');
        open.setAttribute('aria-label', `Подробнее: ${country.name}`);
        const body = element('span', 'card-body');
        body.append(element('span', 'card-region', country.region), element('span', 'card-name', country.name));
        for (const [label, value] of [
            ['Столица', country.capital],
            ['Население', formatNumber(country.population)],
        ]) {
            const row = element('span', 'card-row');
            row.append(element('span', '', label), element('span', '', value));
            body.append(row);
        }
        body.append(element('span', 'card-more', 'Узнать больше ↗'));
        open.append(flag(country.name, country.flagUrl), body);
        item.append(open);
        return item;
    }
    return {
        renderHistory(queries) {
            history.replaceChildren();
            history.hidden = queries.length === 0;
            if (!queries.length)
                return;
            history.append(element('span', 'history-label', 'Недавно искали'));
            for (const query of queries)
                history.append(button(query, () => choose(query), 'chip history-chip'));
            history.append(button('Стереть историю', actions.onClearHistory, 'history-clear'));
        },
        render(state) {
            clear.hidden = input.value.length === 0;
            results.replaceChildren();
            results.setAttribute('aria-busy', String(state.status === 'loading'));
            if (state.status !== 'success')
                details.close();
            switch (state.status) {
                case 'idle':
                    summary.textContent = 'Начните своё исследование';
                    results.append(panel('◎', 'Куда отправимся?', 'Найдите страну по полному названию или его части.'));
                    break;
                case 'waiting':
                    summary.textContent = 'Готовим поиск…';
                    results.append(panel('···', 'Ищем подходящее направление', 'Ещё мгновение — и мы проверим ваш запрос.'));
                    break;
                case 'loading':
                    summary.textContent = `Ищем «${state.query}»…`;
                    results.append(panel('◌', 'Загружаем страны', 'Это обычно занимает несколько секунд.', 'loading'));
                    break;
                case 'empty':
                    summary.textContent = `По запросу «${state.query}» совпадений нет`;
                    results.append(panel('⌕', 'Пока ничего не нашли', 'Проверьте написание на английском или попробуйте более короткий запрос.'));
                    break;
                case 'error': {
                    summary.textContent = 'Поиск не завершён';
                    const error = panel('!', 'Не получилось загрузить страны', state.message, 'error');
                    error.append(button('Повторить', actions.onRetry, 'primary-button'));
                    results.append(error);
                    break;
                }
                case 'success': {
                    summary.textContent = `Найдено стран: ${state.countries.length} · «${state.query}»`;
                    const list = element('ul', 'country-grid');
                    list.append(...state.countries.map(card));
                    results.append(list);
                }
            }
        },
    };
}
