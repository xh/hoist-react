/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldSpec} from './impl/FieldSpec';
import {QueryEngine} from './impl/QueryEngine';
import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {FieldFilter, parseFilter, parseFieldValue} from '@xh/hoist/data';
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
    store;

    /** @member {FieldSpec[]} */
    @observable.ref fieldSpecs = [];

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

    _rawFieldSpecs;

    @managed
    queryEngine;

    // Option values with special handling
    static TRUNCATED = 'TRUNCATED';

    /**
     * @param c - FilterChooserModel configuration.
     * @param {Store} c.store - Store to use for Field resolution as well as extraction of available
     *      Record values for field-specific suggestions. Note that configuring the store here does
     *      NOT cause that store to be automatically filtered or otherwise bound to the Filter.
     * @param {(string[]|FilterChooserFieldSpecConfig[])} [c.fieldSpecs] - specifies the Store
     *      Fields this model will support for filtering and customizes how their available values
     *      will be parsed/displayed. Provide simple Field names or `FilterChooserFieldSpecConfig`
     *      objects to select and customize fields available for filtering. Optional - if not
     *      provided, all Store Fields will be included with options defaulted based on their type.
     * @param {(Filter|* |[])} [c.initialValue] -  Configuration for a filter appropriate to be
     *      shown in this field. Currently this control only edits and creates a flat collection of
     *      FieldFilters, to be 'AND'ed together.
     * @param {Filter[]} [c.initialFavorites] - initial favorites, an array of filter configurations.
     * @param {number} [c.maxResults] - maximum number of results to show before truncating.
     * @param {FilterChooserPersistOptions} [c.persistWith] - options governing persistence.
     */
    constructor({
        store,
        fieldSpecs,
        initialValue = null,
        initialFavorites = [],
        maxResults = 10,
        persistWith
    }) {
        throwIf(!store, 'Must provide a Store to resolve Fields and provide value suggestions.');

        this.store = store;
        this._rawFieldSpecs = this.parseRawFieldSpecs(fieldSpecs);
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

        this.addReaction({
            track: () => this.store.lastUpdated,
            run: () => this.updateFieldSpecs(),
            fireImmediately: true
        });

        this.setValue(initialValue);
        this.setFavorites(initialFavorites);
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

        // Separate suggestions from actual selected filters.
        const [filters, suggestions] = partition(selectValue, v => v.op);

        // Round-trip selected filters through main value setter above.
        this.setValue(this.recombineOrFilters(filters.map(f => new FieldFilter(f))));

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

        // 3) Finally unroll all multi-value filters to one value per filter.
        // The multiple values for 'like' and '=' will later be restored to 'OR' semantics
        return flatMap(ret, (f) => {
            return isArray(f.value) ?
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
        const {maxResults} = this,
            results = this.queryEngine.queryAsync(query);

        if (maxResults > 0 && results.length > maxResults) {
            const truncateCount = results.length - maxResults;
            return [
                ...results.slice(0, maxResults),
                {value: FilterChooserModel.TRUNCATED, truncateCount}
            ];
        }

        return results;
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
        const {field, value, op} = filter,
            spec = this.getFieldSpec(field);

        throwIf(!spec, `Unknown FieldSpec for ${field}`);

        const {fieldType, displayName} = spec,
            displayValue = spec.renderValue(parseFieldValue(value, fieldType, null));

        return {
            displayName,
            displayValue,
            op,
            value: JSON.stringify(filter),
            label: `${displayName} ${op} ${displayValue}`
        };
    }

    createSuggestionOption(fieldSpec) {
        return {
            fieldSpec,
            value: JSON.stringify(fieldSpec),
            label: fieldSpec.displayName
        };
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
    // FieldSpec handling
    //--------------------------------
    @action
    updateFieldSpecs() {
        const {store, _rawFieldSpecs} = this;

        this.fieldSpecs = _rawFieldSpecs.map(rawSpec => {
            return new FieldSpec({
                ...rawSpec,
                storeRecords: store.allRecords
            });
        });
    }

    // Normalize provided raw fieldSpecs / field name strings into partial configs ready for use
    // in constructing FieldSpec instances when Store data is ready / updated.
    parseRawFieldSpecs(rawSpecs) {
        const {store} = this;

        // If no specs provided, include all Store Fields.
        if (isEmpty(rawSpecs)) rawSpecs = store.fieldNames;

        return flatMap(rawSpecs, spec => {
            if (isString(spec)) spec = {field: spec};
            const storeField = store.getField(spec.field);

            if (!storeField) {
                console.warn(`Field '${spec.field}' not found in linked Store - will be ignored.`);
                return [];
            }

            return {...spec, field: storeField};
        });
    }

    getFieldSpec(fieldName) {
        return this.fieldSpecs.find(it => it.field.name === fieldName);
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
 * @typedef {Object} FilterChooserFieldSpecConfig - developer-facing config API to customize
 *      filtering behavior at the Field level.
 * @property {string} field - name of Store Field to enable for filtering - must be resolvable to a
 *      known Field within the associated Store.
 * @property {string} [displayName] - optional override for `Field.displayName` for use within
 *      filtering component controls.
 * @property {string[]} [ops] - operators available for filtering. Optional, will default to
 *      a supported set based on the type of the provided Field.
 * @property {boolean} [suggestValues] - true to provide auto-complete options with data
 *      values sourced either automatically from Store data or as provided directly via the
 *      `values` config below. Default `true` when supported based on the type of the provided
 *      Field and operators. Set to `false` to disable extraction/suggestion of values from Store.
 * @property {[]} [values] - explicit list of available values to autocomplete for this Field.
 *      Optional, will otherwise be extracted and updated from available Store data if applicable.
 * @property {FilterOptionValueRendererCb} [valueRenderer] - function to produce a suitably
 *      formatted string for display to the user for any given field value.
 * @property {FilterOptionValueParserCb} [valueParser] - function to parse user's input from a
 *      filter chooser control into a typed data value suitable for use in filtering comparisons.
 * @property {*} [exampleValue] - sample / representative value used by components to aid usability.
 */


/**
 * @callback FilterOptionValueRendererCb
 * @param {*} value
 * @param {string} op
 * @return {string} - formatted value suitable for display to the user.
 */

/**
 * @callback FilterOptionValueParserCb
 * @param {string} input
 * @param {string} op
 * @return {*} - the parsed value.
 */

/**
 * @typedef {Object} FilterChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true (default) to save value to state.
 * @property {boolean} [persistFavorites] - true (default) to include favorites.
 */
