/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Icon} from '@xh/hoist/icon';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Desktop implementation of StoreFilterField.
 * @private
 */
export function storeFilterFieldImpl({implModel, ...props}) {
    return textInput({
        value: implModel.value,
        leftIcon: Icon.filter(),
        enableClear: true,
        placeholder: withDefault(props.placeholder, 'Quick filter'),
        className: props.className,
        style: props.style,
        width: withDefault(props.width, 180),
        onChange: (v) => implModel.setValue(v, {applyImmediately: false}),
        ...props
    });
}