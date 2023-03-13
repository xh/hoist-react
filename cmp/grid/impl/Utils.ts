import {ColumnRenderer, GroupRowRenderer} from '@xh/hoist/cmp/grid';
import {isFunction} from 'lodash';

/**
 * @internal
 */
export function managedRenderer<T extends ColumnRenderer | GroupRowRenderer>(
    fn: T,
    identifier: string
): T {
    if (!isFunction(fn)) return fn;
    return function () {
        try {
            return fn.apply(null, arguments);
        } catch (e) {
            console.warn(`Renderer for '${identifier}' has thrown an error.`, e);
            return '#ERROR';
        }
    } as unknown as T;
}
