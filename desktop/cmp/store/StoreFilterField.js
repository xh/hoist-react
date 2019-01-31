/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {debounce, escapeRegExp, isEmpty, intersection, without} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {BaseStore} from '@xh/hoist/data';
import {withDefault, throwIf, warnIf} from '@xh/hoist/utils/js';

/**
 * A text input Component that generates a filter function based on simple word-boundary matching of
 * its value to the value of configured fields on a candidate object. If any field values match, the
 * object itself is considered a match.
 *
 * Designed to easily filter records within a Store - either directly (most common) or indirectly
 * via a callback (in cases where custom logic is required, such as layering on additional filters).
 * A Store can be bound to this component via either its `store` OR `gridModel` props.
 *
 * Fields to be searched can be automatically determined from the bound Store or GridModel, and/or
 * customized via the include/excludeFields props. See prop comments for details.
 */
@HoistComponent
export class StoreFilterField extends Component {

    static propTypes = {
        /**
         * Store that this control should filter. By default, all fields configured on the Store
         * will be used for matching. Do not configure this and `gridModel` on the same component.
         */
        store: PT.instanceOf(BaseStore),

        /**
         * GridModel whose Store this control should filter. When given a GridModel, this component
         * will, by default, use the fields for all *visible* columns when matching, as well as any
         * groupBy field. Do not configure this and `store` on the same component.
         */
        gridModel: PT.instanceOf(GridModel),

        /**
         * Names of field(s) to include in search. Required if neither a store nor gridModel are
         * provided, as otherwise fields cannot be inferred.
         *
         * Can be used along with a gridModel to ensure a field is included, regardless of column
         * visibility. Cannot be used with `excludeFields`.
         */
        includeFields: PT.arrayOf(PT.string),

        /** Names of field(s) to exclude from search. Cannot be used with `includeFields`. */
        excludeFields: PT.arrayOf(PT.string),

        /**
         * Delay (in ms) to buffer filtering of the store after the value changes from user input.
         * Default 200ms. Set to 0 to filter immediately on each keystroke. Applicable only when
         * bound to a Store (directly or via a GridModel).
         */
        filterBuffer: PT.number,

        /**
         * Callback to receive an updated filter function. Can be used in place of the `store` or
         * `gridModel` prop when direct filtering of a bound store by this component is not desired.
         * NOTE that calls to this function are NOT buffered and will be made on each keystroke.
         */
        onFilterChange: PT.func,

        /** Text to display when the input is empty. */
        placeholder: PT.string,

        /** Width of the input in pixels. */
        width: PT.number
    };

    @observable value = '';
    filter = null;
    applyFilterFn = null;
    baseClassName = 'xh-store-filter-field';

    constructor(props) {
        super(props);

        throwIf(props.gridModel && props.store, "Cannot specify both 'gridModel' and 'store' props.");
        throwIf(props.includeFields && props.excludeFields, "Cannot specify both 'includeFields' and 'excludeFields' props.");
        warnIf(!props.gridModel && !props.store && isEmpty(props.includeFields), "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op");

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
        const {props} = this;

        return textInput({
            value: this.value,

            leftIcon: Icon.filter(),
            enableClear: true,

            placeholder: withDefault(props.placeholder, 'Quick filter'),
            className: this.getClassName(),
            style: props.style,
            width: withDefault(props.width, 180),

            onChange: this.onValueChange
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
    };

    getActiveStore() {
        const {gridModel, store} = this.props;
        return store || (gridModel && gridModel.store);
    }

    getActiveFields() {
        let {gridModel, includeFields, excludeFields} = this.props,
            store = this.getActiveStore();

        let ret = store ? store.fields.map(f => f.name) : [];
        if (includeFields) ret = store ? intersection(ret, includeFields) : includeFields;
        if (excludeFields) ret = without(ret, excludeFields);

        if (gridModel) {
            const groupBy = gridModel.groupBy,
                visibleCols = gridModel
                    .getLeafColumns()
                    .filter(col => gridModel.isColumnVisible(col.colId));

            ret = ret.filter(f => {
                return (
                    (includeFields && includeFields.includes(f)) ||
                    visibleCols.find(c => c.field == f) ||
                    groupBy.includes(f)
                );
            });
        }
        return ret;
    }
}
export const storeFilterField = elemFactory(StoreFilterField);
