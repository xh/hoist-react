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
                onClick: this.clearInput
            })
        })
    }

    onValueChange = (e) => {
        this.setValue(e.target.value);
        this.runFilter();
    }

    clearInput = () => {
        this.setValue('');
        this.runFilter();
    }

    @action
    runFilter() {
        const {store, fields} = this.props;
        let searchTerm = escapeRegExp(this.value);

        store.filter = null;

        if (searchTerm && fields.length) {
            store.filter = rec => fields.some(f => {
                    const fieldVal = rec[f];
                    return fieldVal && new RegExp('(^|\\W)' + searchTerm, 'ig').test(fieldVal);
                });
        }

        store.applyFilter();
    }
}

export const storeFilterField = elemFactory(StoreFilterField);