/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {textInput} from '@xh/hoist/mobile/cmp/input';

/**
 * Mobile implementation of StoreFilterField.
 * @private
 */
export function storeFilterFieldImpl({implModel, ...props}) {
    return textInput({
        value: implModel.value,
        onChange: (v) => implModel.setValue(v, {applyImmediately: false}),
        placeholder: 'Quick filter',
        width: 180,
        ...props
    });
}