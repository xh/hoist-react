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
import {observable, action} from '@xh/hoist/mobx';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/form';
import {Icon} from '@xh/hoist/icon';
import {BaseStore} from '@xh/hoist/data';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * A text input Component that generates a filter function based on simple word-boundary matching of
 * its value to those of configured fields on a candidate object. If any field values match, the
 * object itself is considered a match.
 *
 * Designed to easily filter records within a store - either directly (most common, with a store
 * passed as a prop) or indirectly via a callback (in cases where custom logic is required, such as
 * layering on additional filters).
 */
@HoistComponent
export class StoreFilterField extends Component {

    static propTypes = {
        /** Initial empty text. */
        placeholder: PT.string,
        /** Names of field(s) within store record objects on which to match and filter. */
        fields: PT.arrayOf(PT.string).isRequired,
        /** Store to which this control should bind and filter directly. */
        store: PT.instanceOf(BaseStore),
        /**
         * Delay (in ms) to buffer filtering of the store after the value changes from user input.
         * Default 200ms. Set to 0 to filter immediately on each keystroke. Applicable only when
         * `store` is specified.
         */
        filterBuffer: PT.number,
        /**
         * Callback to receive an updated filter function. Can be used in place of the `store` prop
         * when direct filtering of a bound store by this component is not desired.
         */
        onFilterChange: PT.func
    };

    @observable value = '';
    filter = null;
    applyFilterFn = null;
    baseClassName = 'xh-store-filter-field';

    constructor(props) {
        super(props);

        if (props.store) {
            const filterBuffer = withDefault(props.filterBuffer, 200);
            this.applyFilterFn = debounce(
                () => this.applyStoreFilter(),
                filterBuffer
            );
        }
    }

    render() {
        return textInput({
            placeholder: withDefault(this.props.placeholder, 'Quick filter'),
            value: this.value,
            onChange: this.onValueChange,
            leftIcon: Icon.filter({style: {opacity: 0.5}}),
            rightElement: button({
                icon: Icon.x(),
                minimal: true,
                onClick: this.onClearClick
            }),
            className: this.getClassName()
        });
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    setValue(v, applyFilterImmediately = false) {
        const {fields, onFilterChange} = this.props,
            {applyFilterFn} = this;

        this.value = v;

        // 0) Regenerate filter
        let searchTerm = escapeRegExp(this.value);

        let filter = null;
        if (searchTerm && fields.length) {
            filter = (rec) => fields.some(f => {
                const fieldVal = rec[f];
                return fieldVal && new RegExp('(^|\\W)' + searchTerm, 'ig').test(fieldVal);
            });
        }
        this.filter = filter;

        // 1) Notify listeners and/or reapply
        if (onFilterChange) onFilterChange(filter);
        if (applyFilterFn) {
            if (applyFilterImmediately) {
                applyFilterFn.cancel();
                this.applyStoreFilter();
            } else {
                applyFilterFn();
            }
        }
    }

    applyStoreFilter() {
        this.props.store.setFilter(this.filter);
    }

    onValueChange = (v) => {
        this.setValue(v);
    };

    onClearClick = () => {
        this.setValue('', true);
    }

}

export const storeFilterField = elemFactory(StoreFilterField);