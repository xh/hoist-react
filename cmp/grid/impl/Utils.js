import {isFunction} from 'lodash';

/**
 * @private
 */
export function managedRenderer(fn, identifier) {
    if (!isFunction(fn)) return fn;
    return function() {
        try {
            return fn.apply(null, arguments);
        } catch (e) {
            console.warn(`Renderer for '${identifier}' has thrown an error.`, e);
            return '#ERROR';
        }
    };
}