/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {textInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';

/**
 * Desktop implementation of StoreFilterField.
 * @internal
 */
export function storeFilterFieldImpl(props) {
    return textInput({
        commitOnChange: true,
        leftIcon: Icon.filter(),
        enableClear: true,
        placeholder: 'Filter',
        selectOnFocus: true,
        width: 180,
        ...props
    });
}
