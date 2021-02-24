/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {textInput} from '@xh/hoist/mobile/cmp/input';

/**
 * Mobile implementation of StoreFilterField.
 * @private
 */
export function storeFilterFieldImpl(props) {
    return textInput({
        commitOnChange: true,
        placeholder: 'Quick filter',
        width: 180,
        ...props
    });
}
