/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {StoreFilterField} from 'hoist/cmp/StoreFilterField';
import {elemFactory} from 'hoist/core';
import {castArray, escapeRegExp} from 'lodash';

/**
 * A Component that can bind to a LeftRightChooser, and filter both lists
 * based on simple text matching in selected fields.
 *
 * @props {boolean} anyMatch - True to match any part of the string, not just the beginning.
 */
@hoistComponent()
class LeftRightChooserFilter extends StoreFilterField {
    
    runFilter() {
        const {fields} = this.props,
            anyMatch = this.props.anyMatch !== false,
            searchTerm = escapeRegExp(this.value);

        const filter = (raw) => {
            return fields.some(f => {
                const fieldVal = !!searchTerm && rec[f];
                return ((fieldVal && new RegExp(`${anyMatch === false ? '(^|\\\\W)' : ''}${searchTerm}`, 'ig').test(fieldVal)) || !fieldVal);
            });
        }

        this.model.setFilter(filter);
    }
}
export const leftRightChooserFilter = elemFactory(LeftRightChooserFilter);