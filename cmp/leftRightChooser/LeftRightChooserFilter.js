/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {StoreFilterField} from 'hoist/cmp/StoreFilterField';
import {elemFactory} from 'hoist/core';
import {escapeRegExp} from 'lodash';

/**
 * A Component that can bind to a LeftRightChooser, and filter both lists
 * based on simple text matching in selected fields.
 */
@hoistComponent()
class LeftRightChooserFilter extends StoreFilterField {
    
    runFilter() {
        const {fields} = this.props,
            searchTerm = escapeRegExp(this.value);

        const filter = (raw) => {
            return fields.some(f => {
                const fieldVal = !!searchTerm && raw[f];
                return ((fieldVal && new RegExp(`(^|\\\\W)${searchTerm}`, 'ig').test(fieldVal)) || !fieldVal);
            });
        };

        this.model.setDisplayFilter(filter);
    }
}
export const leftRightChooserFilter = elemFactory(LeftRightChooserFilter);