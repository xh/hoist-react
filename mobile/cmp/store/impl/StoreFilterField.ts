/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {textInput} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';

/**
 * Mobile implementation of StoreFilterField.
 * @internal
 */
export function storeFilterFieldImpl(props) {
    return textInput({
        commitOnChange: true,
        placeholder: 'Filter',
        width: 180,
        ...props
    });
}
