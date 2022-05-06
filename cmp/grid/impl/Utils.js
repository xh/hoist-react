import {isFunction} from 'lodash';

/**
 * Used to ensure grid renderers cannot bring down an application
 *
 * @private
 */
export function makeRendererSafe(fn, identifier) {
    if (!isFunction(fn)) return fn;
    return function() {
        try {
            return fn.apply(null, arguments);
        } catch (e) {
            console.warn(`Renderer for ${identifier} has thrown an error.`, e);
            return '#ERROR'
        }
    }
}