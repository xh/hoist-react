/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {
    debounce,
    escapeRegExp,
    isEmpty,
    isEqual,
    intersection,
    without,
    upperFirst,
    isFunction
} from 'lodash';
import {hoistCmp, useLocalModel, HoistModel, useContextModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {Store} from '@xh/hoist/data';
import {withDefault, throwIf, warnIf} from '@xh/hoist/utils/js';

/**
 * A text input Component that generates a filter function based on simple word-boundary matching of
 * its value to the value of configured fields on a candidate object. If any field values match, the
 * object itself is considered a match.
 *
 * Designed to easily filter records within a Store - either directly (most common) or indirectly
 * via a callback (in cases where custom logic is required, such as layering on additional filters).
 * A Store can be bound to this component via either its `store` OR `gridModel` props, or manually
 * by writing an onFilterChange prop.
 *
 * This object will default to point to the store of a GridModel found in context, if neither a store,
 * nor a GridModel are provided.  If you *do* not want this behavior (e.g. you intend to manually
 * wire it with onFilterChange) be sure to set GridModel to *null*.
 *
 * Fields to be searched can be automatically determined from the bound Store or GridModel, and/or
 * customized via the include/excludeFields props. See prop comments for details.
 */
export const [StoreFilterField, storeFilterField] = hoistCmp.withFactory({
    displayName: 'StoreFilterField',
    className: 'xh-store-filter-field',

    render({gridModel, store, ...props}) {
        throwIf(gridModel && store, "Cannot specify both 'gridModel' and 'store' props.");

        if (!store) {
            gridModel = withDefault(gridModel, useContextModel(GridModel));
            store = gridModel ? gridModel.store : null;
        }

        // Right now we freeze the initial props -- could be more dynamic.
        // TODO: Build dependencies arg to useLocalModel?
        const localModel = useLocalModel(
            () => new LocalModel({
                gridModel,
                store,
                filterBuffer: withDefault(props.filterBuffer, 200),
                filterOptions: props.filterOptions,
                onFilterChange: props.onFilterChange,
                includeFields: props.includeFields,
                excludeField: props.excludeFields,
                model: props.model,
                bind: props.bind
            })
        );

        return textInput({
            value: localModel.value,

            leftIcon: Icon.filter(),
            enableClear: true,

            placeholder: withDefault(props.placeholder, 'Quick filter'),
            className: props.className,
            style: props.style,
            width: withDefault(props.width, 180),

            onChange: (v) => localModel.setValue(v, {applyImmediately: false})
        });
    }
});
StoreFilterField.propTypes = {
    /**
     * Field on optional model to which this component should bind its value. Not required
     * for filtering functionality (see `gridModel`, `onFilterChange`, and `store` props), but
     * allows the value of this component to be controlled via an external model observable.
     */
    bind: PT.string,

    /** Names of field(s) to exclude from search. Cannot be used with `includeFields`. */
    excludeFields: PT.arrayOf(PT.string),

    /**
     * Delay (in ms) to buffer filtering of the store after the value changes from user input.
     * Default 200ms. Set to 0 to filter immediately on each keystroke. Applicable only when
     * bound to a Store (directly or via a GridModel).
     */
    filterBuffer: PT.number,

    /** Fixed options for Filter to be generated. @see StoreFilter. */
    filterOptions: PT.object,

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

    /** Optional model for value binding - see comments on the `bind` prop for details. */
    model: PT.object,

    /**
     * Callback to receive an updated StoreFilter. Can be used in place of the `store` or
     * `gridModel` prop when direct filtering of a bound store by this component is not desired.
     * NOTE that calls to this function are NOT buffered and will be made on each keystroke.
     */
    onFilterChange: PT.func,

    /** Text to display when the input is empty. */
    placeholder: PT.string,

    /**
     * Store that this control should filter. By default, all fields configured on the Store
     * will be used for matching. Do not configure this and `gridModel` on the same component.
     */
    store: PT.instanceOf(Store),

    /** Width of the input in pixels. */
    width: PT.number
};


@HoistModel
class LocalModel {

    gridModel;
    store;
    filterBuffer;
    filterOptions;
    onFilterChange;
    includeFields;
    excludeFields;
    model;
    bind;

    @observable value = '';

    filter = null;
    applyFilterFn = null;

    constructor({gridModel, store, filterBuffer, filterOptions, onFilterChange, includeFields, excludeFields, model, bind}) {
        this.gridModel = gridModel;
        this.store = store;
        this.filterBuffer = filterBuffer;
        this.filterOptions = filterOptions;
        this.onFilterChange = onFilterChange;
        this.includeFields = includeFields;
        this.excludeFields = excludeFields;
        this.model = model;
        this.bind = bind;

        warnIf(includeFields && excludeFields,
            "Cannot specify both 'includeFields' and 'excludeFields' props."
        );
        warnIf(!gridModel && !store && isEmpty(includeFields),
            "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op"
        );


        if (store) {
            this.applyFilterFn = debounce(
                () => this.applyStoreFilter(),
                filterBuffer
            );

            if (gridModel) {
                this.addReaction({
                    track: () => [gridModel.columns, gridModel.groupBy, filterOptions],
                    run: () => this.regenerateFilter({applyImmediately: false})
                });
            }
        }

        if (model && bind) {
            this.addReaction({
                track: () => model[bind],
                run: (boundVal) => this.setValue(boundVal),
                fireImmediately: true
            });
        }
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    setValue(v, {applyImmediately} = {}) {
        if (isEqual(v, this.value)) return;

        this.value = v;
        this.regenerateFilter({applyImmediately});

        const {bind, model} = this;
        if (bind && model) {
            const setterName = `set${upperFirst(bind)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);
            model[setterName](v);
        }
    }

    regenerateFilter({applyImmediately}) {
        const {applyFilterFn, onFilterChange, filterOptions} = this,
            activeFields = this.getActiveFields(),
            searchTerm = escapeRegExp(this.value);

        let fn = null;
        if (searchTerm && !isEmpty(activeFields)) {
            const regex = new RegExp(`(^|\\W)${searchTerm}`, 'i');
            fn = (rec) => activeFields.some(f => {
                const fieldVal = rec[f];
                return fieldVal && regex.test(fieldVal);
            });
        }
        this.filter = fn ? {...filterOptions, fn} : null;

        if (onFilterChange) onFilterChange(this.filter);

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
        if (this.store) {
            this.store.setFilter(this.filter);
        }
    }

    getActiveFields() {
        let {gridModel, includeFields, excludeFields, store} = this;

        let ret = store ? store.fields.map(f => f.name).concat(['id']) : [];
        if (includeFields) ret = store ? intersection(ret, includeFields) : includeFields;
        if (excludeFields) ret = without(ret, ...excludeFields);

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