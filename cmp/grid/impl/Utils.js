import {isFunction} from 'lodash';

/**
 * Used to ensure grid renderers cannot bring down an application
 *
 * @private
 */
export function makeRendererSafe(fn) {
    if (!isFunction(fn)) return fn;
    return (...args) => {
        try {
            return fn(...args)
        } catch (e) {
            console.warn('A grid renderer has thrown an error.', e);
            return '#ERROR'
        }
    }
}