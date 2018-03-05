/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, inputGroup} from 'hoist/kit/blueprint';
import {setter, observable, action} from 'hoist/mobx';
import {escapeRegExp} from 'lodash';

/**
 * A Component that can bind to any store and filter it,
 * based on simple text messages with text in selected fields.
 */
@hoistComponent()
class StoreFilterField extends Component {
    @setter @observable value = '';

    static defaultProps = {
        store: null,
        fields: []
    }

    render() {
        return inputGroup({
            placeholder: 'Quick filter...',
            value: this.value,
            onChange: this.onValueChange,
            rightElement: button({
                icon: 'cross',
                onClick: this.onClearClick
            })
        })
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