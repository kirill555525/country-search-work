import { button, element, flag, formatNumber } from './dom.js';
export function createDetails() {
    const dialog = element('dialog', 'details');
    dialog.setAttribute('aria-labelledby', 'detail-title');
    const close = button('Закрыть ×', () => dialog.close(), 'close-button');
    close.autofocus = true;
    const content = element('div', 'detail-content');
    dialog.append(close, content);
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog)
            dialog.close();
    });
    document.body.append(dialog);
    return {
        close: () => {
            if (dialog.open)
                dialog.close();
        },
        open: (country) => {
            const title = element('h2', '', country.name);
            title.id = 'detail-title';
            const facts = element('dl', 'facts');
            const values = [
                ['Самоназвание', country.nativeName],
                ['Столица', country.capital],
                ['Регион', country.region],
                ['Субрегион', country.subregion],
                ['Население', formatNumber(country.population)],
                [
                    'Площадь',
                    country.area === null ? 'Нет данных' : `${formatNumber(country.area)} км²`,
                ],
                [
                    'Границы (коды ISO)',
                    country.borders.join(', ') || 'Нет сухопутных границ или данных',
                ],
                ['Языки', country.languages.join(', ') || 'Нет данных'],
                ['Валюты', country.currencies.join(', ') || 'Нет данных'],
            ];
            for (const [label, value] of values) {
                const row = element('div');
                row.append(element('dt', '', label), element('dd', '', value));
                facts.append(row);
            }
            content.replaceChildren(flag(country.name, country.flagUrl), element('p', 'eyebrow', country.code), title, element('p', 'description', country.description), facts);
            dialog.showModal();
        },
    };
}
