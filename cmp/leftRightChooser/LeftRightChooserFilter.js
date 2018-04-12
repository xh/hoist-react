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
 * A Component that can to the leftRightChooser stores, and filter both lists
 * based on simple text matching in selected fields.
 *
 * @props {boolean} anyMatch - True to match any part of the string, not just the beginning.
 */
class LeftRightChooserFilter extends StoreFilterField {
    static defaultProps = {
        anyMatch: true
    };

    runFilter() {
        const {store, fields} = this.props,
            stores = castArray(store),
            {anyMatch} = this.props;

        let searchTerm = escapeRegExp(this.value);

        let filter = filter = side =>
            rec => fields.some(f => {
                const fieldVal = !!searchTerm && rec[f];
                return rec.side === side && ((fieldVal && new RegExp(`${anyMatch === false ? '(^|\\\\W)' : ''}${searchTerm}`, 'ig').test(fieldVal)) || !fieldVal);
            });


        stores.forEach((store, idx) => store.setFilter(filter(idx === 0 ? 'left' : 'right')));
    }
}

export const leftRightChooserFilter = elemFactory(LeftRightChooserFilter);