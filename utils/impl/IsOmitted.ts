/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Thunkable} from '@xh/hoist/core/types/Types';
import {isFunction} from 'lodash';

/**
 * @internal
 */
export function isOmitted(obj?: {omit?: Thunkable<boolean>}): boolean {
    return isFunction(obj?.omit) ? obj.omit() : !!obj?.omit;
}
