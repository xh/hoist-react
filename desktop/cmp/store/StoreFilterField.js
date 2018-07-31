/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {debounce, escapeRegExp} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {observable, setter} from '@xh/hoist/mobx';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textField} from '@xh/hoist/desktop/cmp/form';
import {Icon} from '@xh/hoist/icon';
import {BaseStore} from '@xh/hoist/data';

/**
 * A Component that can bind to any store and filter it
 * based on simple text matching in specified fields.
 */
@HoistComponent()
export class StoreFilterField extends Component {

    static propTypes = {
        /** Store to filter */
        store: PT.instanceOf(BaseStore).isRequired,
        /** Names of fields in store's records to filter by */
        fields: PT.arrayOf(PT.string).isRequired,
        /**
         * Delay (in ms) used to buffer filtering of the store after the value changes from user
         * input (default is 200ms). Set to 0 to filter immediately after user input.
         */
        filterBuffer: PT.number
    };

    @setter @observable value = '';

    constructor(props) {
        super(props);

        const {filterBuffer = 200} = this.props;
        this._debouncedFilter = debounce(this.runFilter, filterBuffer);
    }

    render() {
        return textField({
            placeholder: 'Quick filter...',
            value: this.value,
            onChange: this.onValueChange,
            rightElement: button({
                icon: Icon.x(),
                minimal: true,
                onClick: this.onClearClick
            })
        });
    }

    onValueChange = (v) => {
        this.setValue(v);
        this._debouncedFilter();
    }

    onClearClick = () => {
        this.setValue('');

        // Cancel pending filter and run it immediately
        this._debouncedFilter.cancel();
        this.runFilter();
    }

    runFilter() {
        const {store, fields} = this.props;
        let searchTerm = escapeRegExp(this.value);

        let filter = null;
        if (searchTerm && fields.length) {
            filter = (rec) => fields.some(f => {
                const fieldVal = rec[f];
                return fieldVal && new RegExp('(^|\\W)' + searchTerm, 'ig').test(fieldVal);
            });
        }
        
        store.setFilter(filter);
    }
}

export const storeFilterField = elemFactory(StoreFilterField);