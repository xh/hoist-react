/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
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
            console.warn(`Renderer for '${identifier}' has thrown an error`, e);
            return '#ERROR';
        }
    } as unknown as T;
}
