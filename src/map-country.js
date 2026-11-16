function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function text(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function number(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function list(value) {
    return Array.isArray(value) ? value : [];
}
function flagUrl(value) {
    try {
        const url = new URL(text(value));
        return url.protocol === 'https:' ? url.href : '';
    }
    catch {
        return '';
    }
}
export function mapCountryResponse(raw) {
    const data = record(raw);
    const name = text(data.name);
    if (!name)
        throw new TypeError('Country name is missing in the API response');
    const capital = text(data.capital, 'Не указано');
    const region = text(data.region, 'Не указано');
    const flags = record(data.flags);
    return {
        code: text(data.alpha3Code, name),
        name,
        nativeName: text(data.nativeName, name),
        flagUrl: flagUrl(flags.svg) || flagUrl(flags.png) || flagUrl(data.flag),
        capital,
        region,
        subregion: text(data.subregion, 'Не указано'),
        population: number(data.population),
        area: number(data.area),
        borders: list(data.borders)
            .map((value) => text(value))
            .filter(Boolean),
        languages: list(data.languages)
            .map((value) => text(record(value).name))
            .filter(Boolean),
        currencies: list(data.currencies)
            .map((value) => {
            const currency = record(value);
            return [
                text(currency.name),
                currency.code ? `(${text(currency.code)})` : '',
                text(currency.symbol),
            ]
                .filter(Boolean)
                .join(' ');
        })
            .filter(Boolean),
        description: `${name}. Регион: ${region}. Столица: ${capital}.`,
    };
}
