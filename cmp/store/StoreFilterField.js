/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button, inputGroup} from '@xh/hoist/kit/blueprint';
import {setter, observable} from '@xh/hoist/mobx';
import {escapeRegExp} from 'lodash';

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
        fields: PT.arrayOf(PT.string).isRequired
    };

    @setter @observable value = '';

    render() {
        return inputGroup({
            baseCls: 'xh-store-filter-field',
            placeholder: 'Quick filter...',
            value: this.value,
            onChange: this.onValueChange,
            rightElement: button({
                cls: 'pt-minimal pt-icon-cross',
                onClick: this.onClearClick
            })
        });
    }

    onValueChange = (e) => {
        this.setValue(e.target.value);
        this.runFilter();
    }

    onClearClick = () => {
        this.setValue('');
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