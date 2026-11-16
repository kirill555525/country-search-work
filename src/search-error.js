export function classifySearchError(error) {
    if (error instanceof Error && error.name === 'AbortError')
        return { kind: 'aborted' };
    if (error instanceof Error && error.name === 'TimeoutError') {
        return {
            kind: 'timeout',
            message: 'Сервер не ответил за отведённое время. Повторите поиск.',
        };
    }
    if (error instanceof HttpError) {
        return error.status === 404
            ? { kind: 'empty' }
            : {
                kind: 'http',
                message: `Сервис вернул ошибку ${error.status}. Попробуйте ещё раз.`,
            };
    }
    if (error instanceof TypeError) {
        return {
            kind: 'network',
            message: 'Не удалось получить данные. Проверьте соединение и повторите поиск.',
        };
    }
    return { kind: 'unknown', message: 'Не удалось выполнить поиск. Попробуйте ещё раз.' };
}
import { HttpError } from './http-error.js';
