/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isFunction} from 'lodash';
import type {ReactNode} from 'react';
import {cloneElement, isValidElement} from 'react';
import type {BaseFormFieldProps} from '../BaseFormFieldProps';
import type {FieldModel} from '../field/FieldModel';

/** A FormField's `rightItems` for its model, keyed by position, or null for none. */
export function resolveRightItems(
    rightItems: BaseFormFieldProps['rightItems'],
    model: FieldModel
): ReactNode[] {
    const ret = isFunction(rightItems) ? rightItems(model) : rightItems;
    if (!ret?.length) return null;
    return ret.map((it, idx) =>
        isValidElement(it) && it.key == null ? cloneElement(it, {key: idx}) : it
    );
}
