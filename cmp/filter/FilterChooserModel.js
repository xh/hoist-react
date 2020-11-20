/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FilterChooserFieldSpec} from './FilterChooserFieldSpec';
import {QueryEngine} from './impl/QueryEngine';
import {filterOption} from './impl/Option';
import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {FieldFilter, parseFilter} from '@xh/hoist/data';
import {action, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    compact,
    flatten,
    groupBy,
    isEmpty,
    isString,
    partition,
    sortBy,
    flatMap,
    forEach,
    isArray
} from 'lodash';

@HoistModel
export class FilterChooserModel {

    /** @member Filter */
    @observable.ref value = null;

    /** @member Filter[] */
    @observable.ref favorites = [];

    /** @member {Store} */
    sourceStore;

    /** @member {Store} */
    targetStore;

    /** @member {FilterChooserFieldSpec[]} */
    @managed
    fieldSpecs = [];

    /** @member {number} */
    maxResults;

    /** @member {PersistenceProvider} */
    @managed provider;
    persistValue = false;
    persistFavorites = false;

    // Implementation fields for Control
    @observable.ref selectOptions;
    @observable.ref selectValue;
    @observable favoritesIsOpen = false;
    inputRef = createObservableRef();

    @managed
    queryEngine;

    /**
     * @param c - FilterChooserModel configuration.
     * @param {(string[]|Object[]} [c.fieldSpecs] - specifies the fields this model
     *      supports for filtering and customizes how their available values will be parsed and
     *      displayed. Should be configs for a `FilterChooserFieldSpec`. If a
     *      `sourceStore` is provided, these may be specified as field names in that Store
     *      or omitted entirely, indicating that all Store fields should be filter-enabled.
     * @param {Object} [c.fieldSpecDefaults] - default properties to be
     *      assigned to all FilterChooserFieldSpecs created by this object.
     * @param {Store} [c.sourceStore] - Store to be used to lookup matching Field-level defaults
     *      for `fieldSpecs` and to provide suggested data values (if configured) from user input.
     * @param {Store} [c.targetStore] - Store that should actually be filtered as this model's
     *      value changes. May be the same as `sourceStore`. Leave undefined if you wish to combine
     *      this model's values with other filters, send it to the server, or otherwise observe
     *      and handle value changes manually.
     * @param {(Filter|* |[])} [c.initialValue] -  Configuration for a filter appropriate to be
     *      rendered and managed by FilterChooser. Note that FilterChooser currently can only
     *      edit and create a flat collection of FieldFilters, to be 'AND'ed together.
     * @param {Filter[]} [c.initialFavorites] - initial favorites, an array of filter configurations.
     * @param {number} [c.maxResults] - maximum number of dropdown options to show before truncating.
     * @param {FilterChooserPersistOptions} [c.persistWith] - options governing persistence.
     */
    constructor({
        fieldSpecs,
        fieldSpecDefaults,
        sourceStore = null,
        targetStore = null,
        initialValue = null,
        initialFavorites = [],
        maxResults = 50,
        persistWith
    }) {
        this.sourceStore = sourceStore;
        this.targetStore = targetStore;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);
        this.maxResults = maxResults;
        this.queryEngine = new QueryEngine(this);

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'filterChooser', ...persistWith});
                this.persistValue = persistWith.persistValue ?? true;
                this.persistFavorites = persistWith.persistFavorites ?? true;

                const state = this.provider.read();
                if (this.persistValue && state?.value) initialValue = state.value;
                if (this.persistFavorites && state?.favorites) {
                    initialFavorites = state.favorites.map(f => parseFilter(f));
                }

                this.addReaction({
                    track: () => this.persistState,
                    run: (state) => this.provider.write(state)
                });
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        this.setValue(initialValue);
        this.setFavorites(initialFavorites);

        if (targetStore) {
            this.addReaction({
                track: () => this.value,
                run: (v) => targetStore.setFilter(v),
                fireImmediately: true
            });
        }
    }

    /**
     * Set the value displayed by this control.
     *
     * @param {(Filter|* |[])} value -  Configuration for a filter appropriate to be
     *      shown in this field.
     *
     * Currently this control only supports a flat collection of FilterFields, to
     * be 'AND'ed together. Filters that cannot be parsed or are not supported
     * will cause the control to be cleared.
     */
    @action
    setValue(value) {

        // Always round trip the new value to internal state, but avoid
        // spurious change to the external value.
        try {
            value = parseFilter(value);

            if (!this.validateFilter(value)) {
                value = this.value ?? null;
            }

            const fieldFilters = this.toFieldFilters(value),
                options = fieldFilters.map(f => this.createFilterOption(f));
            this.selectOptions = !isEmpty(options) ? options : null;
            this.selectValue = sortBy(fieldFilters.map(f => JSON.stringify(f)), f => {
                const idx = this.selectValue?.indexOf(f);
                return isFinite(idx) && idx > -1 ? idx : fieldFilters.length;
            });
            if (!this.value?.equals(value)) {
                console.debug('Setting FilterChooser value:', value);
                this.value = value;
            }
        } catch (e) {
            console.error('Failed to set value on FilterChoooserModel', e);
            this.selectOptions = [];
            this.selectValue = [];
            this.value = null;
        }
    }

    //---------------------------
    // Value Handling/Processing
    //---------------------------
    setSelectValue(selectValue) {
        // Rehydrate stringified values
        selectValue = compact(flatten(selectValue)).map(JSON.parse);

        // Separate actual selected filters from field suggestion.
        // (the former is just a transient value on the select control only)
        const [filters, suggestions] = partition(selectValue, 'op');

        // Round-trip actual filters through main value setter above.
        this.setValue(this.recombineOrFilters(filters.map(f => new FieldFilter(f))));

        // And then programmatically re-enter any suggestion
        if (suggestions.length === 1) this.autoComplete(suggestions[0]);
    }

    // Transfer the value filter to the canonical set of individual field filters for display.
    // Implicit 'ORs' on '=' and 'like' will be split.
    toFieldFilters(filter) {
        if (!filter) return [];

        let ret;
        const unsupported = (s) => {
            throw XH.exception(`Unsupported Filter in FilterChooserModel: ${s}`);
        };

        // 1) Flatten to FieldFilters.
        if (filter.isCompoundFilter) {
            if (filter.operator === 'OR') unsupported('OR not supported.');
            ret = filter.filters;
        } else  {
            ret = [filter];
        }
        ret.forEach(f => {
            if (!f.isFieldFilter) unsupported('Filters must be FieldFilters.');
        });

        // 2) Recognize unsupported ANDing of '=' and 'like' for a given Field.
        // FilterChooser treats multiple values for these operators as 'OR' -- see (3) below.
        const groupMap = groupBy(ret, ({op, field}) => [op, field].join('|'));
        forEach(groupMap, (filters, key) => {
            if (filters.length > 1 && (key.startsWith('=') || key.startsWith('like'))) {
                unsupported('Multiple filters cannot be provided with "like" or "=" operator');
            }
        });

        // 3) Finally unroll non-empty check multi-value filters to one value per filter.
        // The multiple values for 'like' and '=' will later be restored to 'OR' semantics
        return flatMap(ret, (f) => {
            return isArray(f.value) && !f.isEmptyCheck() ?
                f.value.map(value => new FieldFilter({...f, value})) :
                f;
        });
    }

    // Recombine value filters on '=' and 'like' on same field into single FieldFilter
    recombineOrFilters(filters) {
        const groupMap = groupBy(filters, ({op, field}) => [op, field].join('|'));
        return flatMap(groupMap, (filters, key) => {
            return (filters.length > 1 && (key.startsWith('=') || key.startsWith('like'))) ?
                new FieldFilter({...filters[0], value: filters.map(it => it.value)}) :
                filters;
        });
    }

    //-------------
    // Querying
    //---------------
    async queryAsync(query) {
        return this.queryEngine.queryAsync(query);
    }

    //--------------------
    // Autocomplete
    //--------------------
    autoComplete(value) {
        const rsSelectCmp = this.inputRef.current?.reactSelectRef?.current;
        if (!rsSelectCmp) return;

        const currentVal = rsSelectCmp.select.state.inputValue,
            newVal = value.displayName,
            inputValue = newVal.length > currentVal.length ? newVal : currentVal;

        rsSelectCmp.select.setState({inputValue, menuIsOpen: true});
        wait(0).then(() => {
            rsSelectCmp.focus();
            rsSelectCmp.handleInputChange(inputValue);
        });
    }

    //---------------------------------
    // Options
    //---------------------------------
    createFilterOption(filter) {
        return filterOption({filter, fieldSpec: this.getFieldSpec(filter.field)});
    }

    //--------------------
    // Favorites
    //--------------------
    get favoritesOptions() {
        return this.favorites.map(value => ({
            value,
            filterOptions: this.toFieldFilters(value).map(f => this.createFilterOption(f))
        }));
    }

    @action
    openFavoritesMenu() {
        this.favoritesIsOpen = true;
    }

    @action
    closeFavoritesMenu() {
        this.favoritesIsOpen = false;
    }

    @action
    setFavorites(favorites) {
        this.favorites = favorites.filter(f => this.validateFilter(f));
    }

    @action
    addFavorite(filter) {
        if (isEmpty(filter) || this.isFavorite(filter)) return;
        this.favorites = [...this.favorites, filter];
    }

    @action
    removeFavorite(filter) {
        this.favorites = this.favorites.filter(f => !f.equals(filter));
    }

    isFavorite(filter) {
        return this.favorites?.find(f => f.equals(filter));
    }

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret = {};
        if (this.persistValue) ret.value = this.value;
        if (this.persistFavorites) ret.favorites = this.favorites;
        return ret;
    }

    //--------------------------------
    // FilterChooserFieldSpec handling
    //--------------------------------
    parseFieldSpecs(specs, fieldSpecDefaults) {
        const {sourceStore} = this;

        throwIf(
            !sourceStore && (!specs || specs.some(isString)),
            'Must provide a sourceStore if fieldSpecs are not provided, or provided as strings.'
        );

        // If no specs provided, include all store fields.
        if (!specs) specs = sourceStore.fieldNames;

        return specs.map(spec => {
            if (isString(spec)) spec = {field: spec};
            return new FilterChooserFieldSpec({
                store: sourceStore,
                ...fieldSpecDefaults,
                ...spec
            });
        });
    }

    getFieldSpec(fieldName) {
        return this.fieldSpecs.find(it => it.field === fieldName);
    }

    validateFilter(f) {
        if (f === null) return true;
        if (f.isFieldFilter) {
            if (!this.getFieldSpec(f.field)) {
                console.error(`Invalid Filter for FilterChooser: ${f.field}`);
                return false;
            }
            return true;
        }

        if (f.isCompoundFilter) {
            if (f.op != 'AND') {
                console.error('Invalid "OR" filter for FilterChooser', f);
                return false;
            }
            if (f.filters.some(it => !it.isFieldFilter)) {
                console.error('Invalid complex filter for FilterChooser', f);
                return false;
            }
            return f.filters.every(it => this.validateFilter(it));
        }

        console.error('Invalid filter for FilterChooser', f);
        return false;
    }
}

/**
 * @typedef {Object} FilterChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true (default) to save value to state.
 * @property {boolean} [persistFavorites] - true (default) to include favorites.
 */
