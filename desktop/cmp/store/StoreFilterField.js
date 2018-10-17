/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {debounce, escapeRegExp, isEmpty, intersection, without} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/form';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {BaseStore} from '@xh/hoist/data';
import {withDefault, throwIf} from '@xh/hoist/utils/js';

/**
 * A text input Component that generates a filter function based on simple word-boundary matching of
 * its value to those of configured fields on a candidate object. If any field values match, the
 * object itself is considered a match.
 *
 * Designed to easily filter records within a store - either directly (most common, with a store
 * passed as a prop) or indirectly via a callback (in cases where custom logic is required, such as
 * layering on additional filters).
 *
 * Fields to be searched can be narrowed by using either the 'includeFields' or 'excludeFields' props.
 * In addition, if control is bound to a GridModel, field to be searched will be further narrowed by
 * fields associated with *visible* columns or fields used for grouping the grid.
 */
@HoistComponent
export class StoreFilterField extends Component {

    static propTypes = {
        /** Initial empty text. */
        placeholder: PT.string,

        /** Store to which this control should bind and filter. Specify this or 'gridModel'. */
        store: PT.instanceOf(BaseStore),

        /** GridModel with Store that this control should filter. Specify this or 'store' */
        gridModel: PT.instanceOf(GridModel),

        /** Names of field(s) within store to include in search. Specify this or `excludeFields`*/
        includeFields: PT.arrayOf(PT.string),

        /** Names of field(s) within store record objects to exclude in  search. Specify this or `includeFields`*/
        excludeFields: PT.arrayOf(PT.string),

        /**
         * Delay (in ms) to buffer filtering of the store after the value changes from user input.
         * Default 200ms. Set to 0 to filter immediately on each keystroke. Applicable only when
         * `store` is specified.
         */
        filterBuffer: PT.number,

        /**
         * Callback to receive an updated filter function. Can be used in place of the `store` or `gridModel` prop
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

        throwIf(props.gridModel && props.store, "Cannot specify both 'gridModel' and 'store' props.");
        throwIf(props.includeFields && props.excludeFields, "Cannot specify both 'includeFields' and 'excludeFields' props.");

        const store = this.getActiveStore();
        if (store) {
            const filterBuffer = withDefault(props.filterBuffer, 200);
            this.applyFilterFn = debounce(
                () => this.applyStoreFilter(),
                filterBuffer
            );

            const {gridModel} = props;
            if (gridModel) {
                this.addReaction({
                    track: () => [gridModel.columns, gridModel.groupBy],
                    run: () => this.regenerateFilter({applyImmediately: false})
                });
            }
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
    setValue(v, {applyImmediately}) {
        this.value = v;
        this.regenerateFilter({applyImmediately});
    }

    regenerateFilter({applyImmediately}) {
        const {onFilterChange} = this.props,
            {applyFilterFn} = this,
            activeFields = this.getActiveFields(),
            searchTerm = escapeRegExp(this.value);

        let filter = null;
        if (searchTerm && !isEmpty(activeFields)) {
            const regex = new RegExp(`(^|\\W)${searchTerm}`, 'i');
            filter = (rec) => activeFields.some(f => {
                const fieldVal = rec[f];
                return fieldVal && regex.test(fieldVal);
            });
        }
        this.filter = filter;

        if (onFilterChange) onFilterChange(filter);
        if (applyFilterFn) {
            if (applyImmediately) {
                applyFilterFn.cancel();
                this.applyStoreFilter();
            } else {
                applyFilterFn();
            }
        }
    }

    applyStoreFilter() {
        const store = this.getActiveStore();
        if (store) {
            store.setFilter(this.filter);
        }
    }

    onValueChange = (v) => {
        this.setValue(v, {applyImmediately: false});
    };

    onClearClick = () => {
        this.setValue('', {applyImmediately: true});
    }

    getActiveStore() {
        const {gridModel, store} = this.props;
        return store || (gridModel && gridModel.store);
    }

    getActiveFields() {
        let {gridModel, includeFields, excludeFields} = this.props,
            store = this.getActiveStore();

        let ret = store ? store.fields.map(f => f.name) : [];
        if (includeFields) ret = intersection(ret, includeFields);
        if (excludeFields) ret = without(ret, excludeFields);
        
        if (gridModel) {
            const {columns, groupBy} = gridModel;
            ret = ret.filter(f => {
                return columns.find(c => (c.field == f && !c.hide)) || groupBy.includes(f);
            });
        }
        return ret;
    }
}
export const storeFilterField = elemFactory(StoreFilterField);