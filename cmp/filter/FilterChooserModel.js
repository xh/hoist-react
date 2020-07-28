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
import {start} from '@xh/hoist/promise';
import {differenceWith, isEmpty, isEqual, isNil, isNaN, isPlainObject, groupBy, sortBy, map, take, partition, flatten, compact} from 'lodash';

import {FilterOptionsModel} from './FilterOptionsModel';

@HoistModel
export class FilterChooserModel {

    @observable.ref value;
    @observable.ref history;
    @observable.ref options;

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
    static SUGGESTIONS = 'SUGGESTIONS';

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
        this.value = compact(flatten(value));
        this.syncToFilterModel();
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
        this.value = filters.map(f => f.serialize());
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

        // Determine operator provided in query.
        const words = query.split(' ').map(it => it.trim()),
            [keywords, queryParts] = partition(words, w => this.getOperatorForKeyword(w)),
            queryOperator = keywords.length === 1 ? this.getOperatorForKeyword(keywords[0]) : null;

        // Determine which parts of the query correspond to field and value
        let queryField, queryValue;
        if (queryOperator) {
            // If an operator has been provided, treat everything to its left as the field,
            // and everything to its right as the value.
            const idx = words.indexOf(queryOperator);
            queryField = queryParts.slice(0, idx).join(' ');
            queryValue = queryParts.slice(idx).join(' ');
        } else {
            // If no operator has been provided, treat the entire query as the field with no value.
            queryField = queryParts.join(' ');
        }

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
                return this.getRegExp(queryField).test(spec.displayName);
            });
            if (!isEmpty(suggestions)) {
                options.push({value: FilterChooserModel.SUGGESTIONS, suggestions});
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

    getOperatorForKeyword(keyword) {
        switch (keyword) {
            case '=':
            case ':':
            case 'is':
                return '=';
            case '!=':
            case 'not':
                return '!=';
            case '>':
            case '>=':
            case '<':
            case '<=':
            case 'like':
                return keyword;
        }
        return null;
    }

    sortByQuery(options, query) {
        if (!query) return sortBy(options, it => it.value);

        const sortQuery = query.replace(/:$/, ''),
            sortRe = new RegExp('^' + sortQuery, 'i'),
            queryLength = sortQuery.length;

        return sortBy(options, it => {
            const {value, displayName} = it;

            let sorter;
            if (value === FilterChooserModel.SUGGESTIONS) {
                sorter = 6;
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