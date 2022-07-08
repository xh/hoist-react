/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {textInput} from '@xh/hoist/mobile/cmp/input';

/**
 * Mobile implementation of StoreFilterField.
 * @private
 */
export function storeFilterFieldImpl(props) {
    return textInput({
        commitOnChange: true,
        placeholder: 'Filter',
        width: 180,
        ...props
    });
}
