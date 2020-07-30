/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel, managed, PersistenceProvider} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {FieldFilter, FilterModel, parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {start, wait} from '@xh/hoist/promise';
import {
    differenceWith,
    isEmpty,
    isEqual,
    isNil,
    isNaN,
    isPlainObject,
    groupBy,
    sortBy,
    map,
    take,
    partition,
    flatten,
    compact,
    escapeRegExp,
    without
} from 'lodash';

import {FilterOptionsModel} from './FilterOptionsModel';

@HoistModel
export class FilterChooserModel {

    @observable.ref value;
    @observable.ref history;
    @observable.ref options;

    inputRef = createObservableRef();

    // Immutable properties
    filterModel = null;
    filterOptionsModel = null;
    limit = null;
    maxHistoryLength = null;

    @managed provider;
    persistValue = false;
    persistHistory = false;

    // Option values with special handling
    static TRUNCATED = 'TRUNCATED';
    static SUGGEST_PREFIX = '*SUGGEST*';

    /**
     * @param c - FilterChooserModel configuration.
     * @param {(FilterModel|Object)} c.filterModel - FilterModel, or config to create one.
     * @param {(FilterOptionsModel|Object)} c.filterOptionsModel - FilterOptionsModel, or config to create one.
     * @param {number} [c.limit] - maximum number of results to show before truncating.
     * @param {FilterChooserPersistOptions} [c.persistWith] - options governing history persistence
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by the control on a FIFO basis).
     */
    constructor({
        filterModel,
        filterOptionsModel,
        limit= 10,
        persistWith,
        maxHistoryLength = 10
    }) {
        throwIf(!filterModel, 'Must provide a FilterModel (or a config to create one)');
        throwIf(!filterOptionsModel, 'Must provide a FilterOptionsModel (or a config to create one)');

        this.filterModel = isPlainObject(filterModel) ? this.markManaged(new FilterModel(filterModel)) : filterModel;
        this.filterOptionsModel = isPlainObject(filterOptionsModel) ? this.markManaged(new FilterOptionsModel(filterOptionsModel)) : filterOptionsModel;

        this.limit = limit;
        this.maxHistoryLength = maxHistoryLength;

        // Read state from provider -- fail gently
        const persistValue = this.persistValue = persistWith ? (persistWith.persistValue ?? true) : false;
        const persistHistory = this.persistHistory = persistWith ? (persistWith.persistHistory ?? true) : false;

        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'filterChooser', ...persistWith});

                const state = this.provider.read();
                if (persistValue && state?.value) this.filterModel.setFilters(state.value);
                if (persistHistory && state?.history) this.history = state.history;

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
            track: () => [this.filterModel.filters, this.filterOptionsModel.specs],
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
        const filters = this.value?.map(it => FieldFilter.parse(it)) ?? [],
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
     * Combine value filters (= | !=) on same field / operation into 'in' and 'notin' filters
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
     * Split 'in' and 'notin' filters into collections of '=' and '!=' filters
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
        if (!query || !query.length) return [];

        // Split query into field, operator and value.
        const operators = without(FieldFilter.OPERATORS, 'in', 'notin'),
            operatorReg = sortBy(operators, o => {
                return -o.length;
            }).map(o => {
                return escapeRegExp(o);
            }).join('|');

        const [queryField, queryOperator, queryValue] = query.split(
            this.getRegExp('(' + operatorReg + ')')
        ).map(it => it.trim());

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
            const suggestions = this.filterOptionsModel.specs.filter(spec => {
                return spec.displayName.toLowerCase().startsWith(queryField.toLowerCase());
            }).map(spec => {
                return {
                    isSuggestion: true,
                    value: `${FilterChooserModel.SUGGEST_PREFIX}${spec.displayName}`,
                    spec: spec
                };
            });

            if (!isEmpty(suggestions)) {
                options.push(...suggestions);
            }
        }

        return options;
    }

    getOptionsForValueQuery(queryField, queryValue, queryOperator) {
        const fullQuery = queryOperator && !isEmpty(queryField) && !isEmpty(queryValue),
            operator = queryOperator ?? '=', // If no operator included in query, assume '='
            options = [];

        const specs = this.filterOptionsModel.specs.filter(spec => {
            const {filterType, displayName, operators} = spec;
            if (!operators.includes(operator)) return false;

            if (filterType === 'value') {
                // For value filters, provide options based only on partial field match.
                return !fullQuery || this.getRegExp(queryField).test(displayName);
            } else {
                // Range filters support value operators (e.g. '=', '!='). For range filters
                // the user must have provided the full query to get a match.
                return fullQuery && this.getRegExp(queryField).test(displayName);
            }
        });

        specs.forEach(spec => {
            const {field, filterType, fieldType, displayName, values} = spec;

            if (filterType === 'value' && ['=', '!='].includes(operator)) {
                values.forEach(value => {
                    const displayValue = spec.renderValue(value, operator);

                    let match;
                    if (fullQuery) {
                        // Matching for usage where both field and value are specified, with partial
                        // matching for either side.
                        const fieldMatch = this.getRegExp(queryField).test(displayName),
                            valueMatch = this.getRegExp(queryValue).test(value);

                        match = fieldMatch && valueMatch;
                    } else {
                        // One one part provided - match against both field and value to catch
                        // both possibilities
                        match = this.getRegExp(queryField).test(displayName + ' ' + value);
                    }
                    if (!match) return;

                    const option = {field, value, operator, fieldType, displayName, displayValue};
                    options.push(this.createOption(option));
                });
            } else if (fullQuery) {
                // For filters which require a fully specified query, create an option with the
                // query value.
                const value = spec.parseValue(queryValue, operator);
                if (isNil(value) || isNaN(value)) return;

                const displayValue = spec.renderValue(value, operator),
                    option = {field, value, operator, fieldType, displayName, displayValue};

                options.push(this.createOption(option));
            }
        });

        return options;
    }

    getOptionsForRangeQuery(queryField, queryValue, queryOperator) {
        if (!queryOperator || isEmpty(queryValue)) return [];

        const operator = queryOperator,
            options = [];

        const specs = this.filterOptionsModel.specs.filter(spec => {
            const {filterType, displayName, operators} = spec;
            if (!operators.includes(operator)) return false;
            return filterType === 'range' && this.getRegExp(queryField).test(displayName);
        });

        specs.forEach(spec => {
            const {field, fieldType, displayName} = spec;

            const match = this.getRegExp(queryField).test(displayName);
            if (!match) return;

            const value = spec.parseValue(queryValue, operator);
            if (isNil(value) || isNaN(value)) return;

            const displayValue = spec.renderValue(value, operator),
                option = {field, value, operator, fieldType, displayName, displayValue};

            options.push(this.createOption(option));
        });

        return options;
    }

    getOptionsForFilters(filters) {
        const options = [];

        filters.forEach(filter => {
            const spec = this.filterOptionsModel.getSpec(filter.field);
            if (!spec) return;

            const {field, operator, fieldType} = filter,
                value = parseFieldValue(filter.value, fieldType, null),
                displayName = spec.displayName,
                displayValue = spec.renderValue(value, operator);

            const option = {field, value, operator, fieldType, displayName, displayValue, filter};
            options.push(this.createOption(option));
        });

        return options;
    }

    createOption(opt) {
        const {field, value, operator, fieldType, displayName, displayValue} = opt,
            filter = FieldFilter.parse(opt.filter ?? {field, operator, value, fieldType});

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
            const labels = entry.map(it => it.label),
                value = entry.map(it => it.value);

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
        return this.getOptionsForFilters(filters).map(it => {
            const {value, label} = it;
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
}

/**
 * @typedef {Object} FilterChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true to include value, as filters (default true)
 * @property {boolean} [persistHistory] - true to include history (default true)
 */