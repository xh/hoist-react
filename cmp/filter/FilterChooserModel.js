/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FilterChooserFieldSpec} from '@xh/hoist/cmp/filter/impl/FilterChooserFieldSpec';
import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {FieldFilter, FilterModel, parseFieldValue} from '@xh/hoist/data';
import {action, observable} from '@xh/hoist/mobx';
import {start, wait} from '@xh/hoist/promise';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    compact,
    differenceWith,
    escapeRegExp,
    flatten,
    groupBy,
    isEmpty,
    isEqual,
    isNaN,
    isNil,
    isString,
    map,
    partition,
    sortBy,
    take,
    without
} from 'lodash';

@HoistModel
export class FilterChooserModel {

    @observable.ref value;
    @observable.ref history;
    @observable.ref options;

    /** @member {FilterModel} */
    filterModel;
    /** @member {Store} */
    store;

    /** @member {FilterChooserFieldSpec[]} */
    @observable.ref fieldSpecs = [];

    /** @member {string} */
    valueSourceRecords;
    /** @member {number} */
    limit;
    /** @member {number} */
    maxHistoryLength;

    /** @member {PersistenceProvider} */
    @managed provider;
    persistValue = false;
    persistHistory = false;

    inputRef = createObservableRef();

    /** @member {RawFilterChooserFieldSpec[]} */
    _rawFieldSpecs;


    // Option values with special handling
    static TRUNCATED = 'TRUNCATED';
    static SUGGEST_PREFIX = '*SUGGEST*';

    /**
     * @param c - FilterChooserModel configuration.
     * @param {(FilterModel|Object)} c.filterModel - FilterModel, or config to create one.
     * @param {Store} c.store - Store to use for Field resolution as well as extraction of available
     *      Record values for field-specific suggestions. Note that configuring the store here does
     *      NOT cause that store to be automatically filtered or otherwise bound to the FilterModel.
     * @param {(string[]|FilterChooserFieldSpecConfig[])} [c.fieldSpecs] - specifies the Store
     *      Fields this model will support for filtering and customizes how their available values
     *      will be parsed/displayed. Provide simple Field names or `FilterChooserFieldSpecConfig`
     *      objects to select and customize fields available for filtering. Optional - if not
     *      provided, all Store Fields will be included with options defaulted based on their type.
     * @param {string} [c.valueSourceRecords] - determines the set of Store Records used to extract
     *      value suggestions for applicable field filters - either 'filtered' (default) or 'all'.
     * @param {number} [c.limit] - maximum number of results to show before truncating.
     * @param {FilterChooserPersistOptions} [c.persistWith] - options governing history persistence
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by the control on a LRU basis).
     */
    constructor({
        filterModel,
        store,
        fieldSpecs,
        valueSourceRecords = 'filtered',
        limit = 10,
        persistWith,
        maxHistoryLength = 10
    }) {
        throwIf(!filterModel, 'Must provide a FilterModel (or a config to create one).');
        throwIf(!store, 'Must provide a Store to resolve Fields and provide value suggestions.');
        throwIf(!['filtered', 'all'].includes(valueSourceRecords), `Invalid valueSourceRecords config '${valueSourceRecords}'.`);

        this.filterModel = filterModel.isFilterModel ? filterModel : this.markManaged(new FilterModel(filterModel));
        this.store = store;
        this._rawFieldSpecs = this.parseRawFieldSpecs(fieldSpecs);

        this.addReaction({
            track: () => this.store.lastUpdated,
            run: () => this.updateFieldSpecs()
        });

        this.limit = limit;
        this.maxHistoryLength = maxHistoryLength;

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'filterChooser', ...persistWith});
                this.persistValue = persistWith.persistValue ?? true;
                this.persistHistory = persistWith.persistHistory ?? true;

                const state = this.provider.read();
                if (this.persistValue && state?.value) this.filterModel.setFilters(state.value);
                if (this.persistHistory && state?.history) this.history = state.history;

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
            track: () => [this.filterModel.filters, this.fieldSpecs],
            run: () => this.syncFromFilterModel()
        });
    }

    @action
    setValue(value) {
        const [suggestions, filters] = partition(compact(flatten(value)), v => {
            return v.startsWith(FilterChooserModel.SUGGEST_PREFIX);
        });

        this.value = filters;
        this.syncToFilterModel();

        if (suggestions.length === 1) this.autoComplete(suggestions[0]);
    }

    //--------------------
    // Autocomplete
    //--------------------
    autoComplete(value) {
        const rsSelectCmp = this.inputRef.current?.reactSelectRef?.current;
        if (!rsSelectCmp) return;

        const currentVal = rsSelectCmp.select.state.inputValue,
            newVal = value.replace(FilterChooserModel.SUGGEST_PREFIX, ''),
            inputValue = newVal.length > currentVal.length ? newVal : currentVal;

        rsSelectCmp.select.setState({inputValue, menuIsOpen: true});
        wait(0).then(() => {
            rsSelectCmp.focus();
            rsSelectCmp.handleInputChange(inputValue);
        });
    }

    //--------------------
    // Filter Model
    //--------------------
    syncToFilterModel() {
        const filters = this.value?.map(it => FieldFilter.create(it)) ?? [],
            combinedFilters = this.combineFilters(filters);

        this.filterModel.setFilters(combinedFilters);
        this.addToHistory(filters);
        start(() => this.syncFromFilterModel());
    }

    @action
    syncFromFilterModel() {
        const filters = this.splitFilters(this.filterModel.filters),
            options = this.getOptionsForFilters(filters);

        this.options = options.length ? options : null;
        this.value = sortBy(filters.map(f => f.serialize()), f => {
            const idx = this.value?.indexOf(f);
            return isFinite(idx) && idx > -1 ? idx : filters.length;
        });
    }

    /**
     * Combine value filters (= | !=) on same field / operation into 'in' and 'notin' filters.
     * @return {FieldFilter[]}
     */
    combineFilters(filters) {
        const [valueFilters, rangeFilters] = partition(filters, f => ['=', '!='].includes(f.operator));

        // Group value filters (== | !=) on same field / operation into 'in' and 'notin' filters
        const groupMap = groupBy(valueFilters, f => {
            const {field, operator, fieldType} = f;
            return [field, operator === '=' ? 'in' : 'notin', fieldType].join('|');
        });
        const groupedFilters = map(groupMap, (v, k) => {
            const [field, operator, fieldType] = k.split('|'),
                value = v.map(it => it.value);
            return new FieldFilter({field, value, operator, fieldType});
        });

        return [...groupedFilters, ...rangeFilters];
    }

    /**
     * Split 'in' and 'notin' filters into collections of '=' and '!=' filters.
     * @return {FieldFilter[]}
     */
    splitFilters(filters) {
        const ret = [];
        filters.filter(it => it.isFieldFilter).forEach(filter => {
            if (['in', 'notin'].includes(filter.operator)) {
                const {field, fieldType} = filter,
                    operator = filter.operator === 'in' ? '=' : '!=';

                ret.push(
                    ...filter.value.map(value => {
                        return new FieldFilter({field, operator, value, fieldType});
                    })
                );
            } else {
                ret.push(filter);
            }
        });
        return ret;
    }

    //--------------------
    // Querying
    //--------------------
    async queryAsync(query) {
        const {limit} = this,
            results = this.sortByQuery(this.filterByQuery(query), query);

        if (limit > 0 && results.length > limit) {
            const truncateCount = results.length - limit;
            return [
                ...results.slice(0, limit),
                {value: FilterChooserModel.TRUNCATED, truncateCount}
            ];
        }

        return results;
    }

    filterByQuery(query) {
        if (isEmpty(query)) return [];

        // Split query into field, operator and value.
        const operators = without(FieldFilter.OPERATORS, 'in', 'notin'),
            operatorReg = sortBy(operators, o => -o.length)
                .map(o => escapeRegExp(o))
                .join('|');

        const [queryField, queryOperator, queryValue] = query
            .split(this.getRegExp('(' + operatorReg + ')'))
            .map(it => it.trim());

        // Get options for the given query, according to the query type specified by the operator
        const valueOperators = ['=', '!=', 'like'],
            rangeOperators = ['>', '>=', '<', '<='],
            options = [];

        if (!queryOperator || valueOperators.includes(queryOperator)) {
            options.push(...this.getOptionsForValueQuery(queryField, queryValue, queryOperator));
        } else if (rangeOperators.includes(queryOperator)) {
            options.push(...this.getOptionsForRangeQuery(queryField, queryValue, queryOperator));
        }

        // Provide suggestions for field specs that partially match the query.
        if (isEmpty(queryValue) || isEmpty(options)) {
            const suggestions = this.fieldSpecs
                .filter(spec => spec.displayName.toLowerCase().startsWith(queryField.toLowerCase()))
                .map(spec => ({
                    isSuggestion: true,
                    value: `${FilterChooserModel.SUGGEST_PREFIX}${spec.displayName}`,
                    spec
                }));
            options.push(...suggestions);
        }

        return options;
    }

    getOptionsForValueQuery(queryField, queryValue, queryOperator) {
        const fullQuery = queryOperator && !isEmpty(queryField) && !isEmpty(queryValue),
            operator = queryOperator ?? '=', // If no operator included in query, assume '='
            options = [];

        const testField = (s) => this.getRegExp(queryField).test(s);
        const testValue = (s) => this.getRegExp(queryValue).test(s);
        const specs = this.fieldSpecs.filter(spec => {
            if (!spec.supportsOperator(operator)) return false;

            // Value filters provide options based only on partial field match.
            // Range filters support value operators (e.g. '=', '!='). Must provide full query.
            return spec.isValueType ?
                !fullQuery || testField(spec.displayName) :
                fullQuery && testField(spec.displayName);
        });

        specs.forEach(spec => {
            const {displayName, values} = spec;

            if (values && ['=', '!='].includes(operator)) {
                const nameMatches = testField(displayName);
                values.forEach(value => {
                    // Where both field and value specified use partial match for either side
                    // If only one part provided just match against both together
                    const match = fullQuery ?
                        nameMatches && testValue(value) :
                        testField(displayName + ' ' + value);

                    if (match) {
                        options.push(this.createOption({spec, value, operator}));
                    }
                });
            } else if (fullQuery) {
                // For filters which require a fully spec'ed query, create an option with the value.
                const value = spec.parseValue(queryValue, operator);
                if (!isNil(value) && !isNaN(value)) {
                    options.push(this.createOption({spec, value, operator}));
                }
            }
        });

        return options;
    }

    getOptionsForRangeQuery(queryField, queryValue, queryOperator) {
        if (!queryOperator || isEmpty(queryValue)) return [];

        const operator = queryOperator,
            options = [];

        const specs = this.fieldSpecs.filter(spec => {
            return spec.supportsOperator(operator) &&
                spec.isRangeFilter &&
                this.getRegExp(queryField).test(spec.displayName);
        });

        specs.forEach(spec => {
            const value = spec.parseValue(queryValue, operator);
            if (!isNil(value) && !isNaN(value)) {
                options.push(this.createOption({spec, value, operator}));
            }
        });

        return options;
    }

    /** @param {FieldFilter[]} filters */
    getOptionsForFilters(filters) {
        const options = [];

        filters.forEach(filter => {
            const spec = this.getFieldSpec(filter.field);
            if (spec) {
                const {operator, fieldType} = filter,
                    value = parseFieldValue(filter.value, fieldType, null);
                options.push(this.createOption({spec, value, operator, filter}));
            }
        });

        return options;
    }

    createOption({spec, value, operator, filter}) {
        const {displayName, field} = spec,
            displayValue = spec.renderValue(value);
        filter = FieldFilter.create(filter ?? {field, operator, value, fieldType: field.type});

        return {
            displayName,
            displayValue,
            operator,
            value: filter.serialize(),
            label: `${displayName} ${operator} ${displayValue}`
        };
    }

    // Returns a case-insensitive reg exp for query testing
    getRegExp(pattern) {
        return new RegExp(pattern, 'ig');
    }

    sortByQuery(options, query) {
        if (!query) return sortBy(options, it => it.value);

        const sortQuery = query.replace(/:$/, ''),
            sortRe = new RegExp('^' + sortQuery, 'i'),
            queryLength = sortQuery.length;

        return sortBy(options, it => {
            const {value, displayName} = it;

            let sorter;
            if (it.isSuggestion) {
                sorter = 0;
            } else if (sortRe.test(value)) {
                sorter = queryLength === value.length ? 1 : 2;
            } else if (sortRe.test(displayName)) {
                sorter = queryLength === value.length ? 3 : 4;
            } else {
                sorter = 5;
            }

            return `${sorter}-${displayName}-${value}`;
        });
    }

    //--------------------
    // History
    //--------------------
    get hasHistory() {
        return !isEmpty(this.historyOptions);
    }

    get historyOptions() {
        if (!isEmpty(this.value) || isEmpty(this.history)) return [];

        return this.history.map(entry => {
            const labels = map(entry, 'label'),
                value = map(entry, 'value');

            return {isHistory: true, value, labels};
        });
    }

    @action
    addToHistory(filters) {
        if (isEmpty(filters)) return;

        // Convert filters to history items
        const items = this.getHistoryValue(filters);

        // Remove, add to front, and truncate
        let {history, maxHistoryLength} = this;
        history = differenceWith(history, [items], isEqual);
        this.history = take([items, ...history], maxHistoryLength);
    }

    getHistoryValue(filters) {
        return this.getOptionsForFilters(filters).map(({value, label}) => {
            return {value, label};
        });
    }

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret = {};
        if (this.persistValue) ret.value = this.value;
        if (this.persistHistory) ret.history = this.history;
        return ret;
    }

    //--------------------------------
    // FilterChooserFieldSpec handling
    //--------------------------------
    @action
    updateFieldSpecs() {
        const {store, valueSourceRecords, _rawFieldSpecs} = this;

        this.fieldSpecs = _rawFieldSpecs.map(rawSpec => {
            return new FilterChooserFieldSpec({
                ...rawSpec,
                storeRecords: valueSourceRecords === 'filtered' ? store.records : store.allRecords
            });
        });
    }

    // Normalize provided raw fieldSpecs / field name strings into partial configs ready for use
    // in constructing FilterChooserFieldSpec instances when Store data is ready / updated.
    parseRawFieldSpecs(rawSpecs) {
        const {store} = this,
            ret = [];

        // If no specs provided, include all Store Fields.
        if (isEmpty(rawSpecs)) rawSpecs = store.fieldNames;

        rawSpecs.forEach(spec => {
            if (isString(spec)) spec = {field: spec};
            const storeField = store.getField(spec.field);

            if (!storeField) {
                console.warn(`Field '${spec.field}' not found in linked Store - will be ignored.`);
                return;
            }

            ret.push({
                ...spec,
                field: storeField
            });
        });

        return ret;
    }

    getFieldSpec(fieldName) {
        return this.fieldSpecs.find(it => it.field.name === fieldName);
    }
}

/**
 * @typedef {Object} FilterChooserFieldSpecConfig - developer-facing config API to customize
 *      filtering behavior at the Field level.
 * @property {string} field - name of Store Field to enable for filtering - must be resolvable to a
 *      known Field within the associated Store.
 * @property {string} [displayName] - optional override for `Field.displayName` for use within
 *      filtering component controls.
 * @property {string[]} [operators] - operators available for filtering. Optional, will default to
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
 * @typedef {Object} RawFilterChooserFieldSpec - partially processed spec for internal use by this
 *     class. Identical to `FilterChooserFieldSpecConfig` but with resolved `Field` instance.
 * @property {Field} field
 * @property {string} displayName
 * @property {string[]} operators
 * @property {boolean} suggestValues
 * @property {[]} values
 * @property {FilterOptionValueRendererCb} [valueRenderer]
 * @property {FilterOptionValueParserCb} [valueParser]
 * @property {*} [exampleValue]
 */

/**
 * @callback FilterOptionValueRendererCb
 * @param {*} value
 * @param {string} operator
 * @return {string} - formatted value suitable for display to the user.
 */

/**
 * @callback FilterOptionValueParserCb
 * @param {string} input
 * @param {string} operator
 * @return {*} - the parsed value.
 */

/**
 * @typedef {Object} FilterChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true (default) to include value (serialized filters)
 * @property {boolean} [persistHistory] - true (default) to include history
 */
