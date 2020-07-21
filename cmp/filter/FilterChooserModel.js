/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel, managed, PersistenceProvider} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {Filter, FilterModel, parseFieldValue} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {differenceWith, isEmpty, isEqual, isNil, isPlainObject, groupBy, sortBy, map, take, partition} from 'lodash';

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
        limit,
        persistWith,
        maxHistoryLength = 5
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
        this.value = value;
        this.addToHistory(value);
        this.syncToFilterModel();
    }

    //--------------------
    // Filter Model
    //--------------------
    syncToFilterModel() {
        const filters = this.combineFilters(this.value?.map(it => Filter.parse(it)) ?? []);
        this.filterModel.setFilters(filters);
        if (this.persistValue) this.provider.write({value: filters});
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
            return new Filter({field, value, operator, fieldType});
        });

        return [...groupedFilters, ...rangeFilters];
    }

    /**
     * Split 'in' and 'notin' filters into collections of '=' and '!=' filters
     */
    splitFilters(filters) {
        const ret = [];
        filters.forEach(filter => {
            if (['in', 'notin'].includes(filter.operator)) {
                const {field, fieldType} = filter,
                    operator = filter.operator === 'in' ? '=' : '!=';

                ret.push(
                    ...filter.value.map(value => {
                        return new Filter({field, operator, value, fieldType});
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
                {value: 'TRUNCATED-MESSAGE', displayValue: `${fmtNumber(truncateCount)} results truncated`}
            ];
        }

        return results;
    }

    filterByQuery(query) {
        if (!query || !query.length) return [];

        // Determine operator specified in query. If not specified, assume '='
        const words = query.split(' ').map(it => it.trim()),
            [keywords, queryParts] = partition(words, w => this.getOperatorForKeyword(w)),
            [queryField, queryValue] = queryParts;

        const operator = keywords.length ? this.getOperatorForKeyword(keywords[0]) : '=',
            valueOperators = ['=', '!='],
            rangeOperators = ['>', '>=', '<', '<='];

        if (valueOperators.includes(operator)) {
            return this.getOptionsForValueQuery(queryField, queryValue, operator);
        } else if (rangeOperators.includes(operator)) {
            return this.getOptionsForRangeQuery(queryField, queryValue, operator);
        }

        return [];
    }

    getOptionsForValueQuery(queryField, queryValue, operator) {
        const fullQuery = !isEmpty(queryField) && !isEmpty(queryValue),
            options = [];

        const specs = this.filterOptionsModel.specs.filter(spec => {
            const {filterType, displayName} = spec;
            return (
                filterType === 'value' &&
                (!fullQuery || this.getRegExp(queryField).test(displayName))
            );
        });

        specs.forEach(spec => {
            const {field, fieldType, displayName, values} = spec;
            values.forEach(value => {
                const displayValue = spec.renderValue(value);

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
        });

        return options;
    }

    getOptionsForRangeQuery(queryField, queryValue, operator) {
        const fullQuery = !isEmpty(queryField) && !isEmpty(queryValue),
            options = [];

        const specs = this.filterOptionsModel.specs.filter(spec => {
            const {filterType, displayName} = spec;
            return (
                filterType === 'range' &&
                (!fullQuery || this.getRegExp(queryField).test(displayName))
            );
        });

        specs.forEach(spec => {
            const {field, fieldType, displayName} = spec,
                value = parseFieldValue(fullQuery ? queryValue : queryField, fieldType, null);

            if (isNil(value) || isNaN(value)) return;

            // If both both field and value are specified, only return an option for specified field.
            // Otherwise, return an option for each field
            if (fullQuery) {
                const match = this.getRegExp(queryField).test(displayName);
                if (!match) return;
            }

            const displayValue = spec.renderValue(value),
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
                displayValue = spec.renderValue(value);

            const option = {field, value, operator, fieldType, displayName, displayValue, filter};
            options.push(this.createOption(option));
        });

        return options;
    }

    createOption(opt) {
        const {field, value, operator, fieldType, displayName, displayValue} = opt,
            filter = opt.filter ?? new Filter({field, operator, value, fieldType});

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
        return new RegExp('\\b' + pattern, 'i');
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
            if (sortRe.test(value)) {
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
    @action
    addToHistory(value) {
        if (!this.persistHistory || isEmpty(value)) return;

        // Remove, add to front, and truncate
        let {history, maxHistoryLength} = this;
        history = differenceWith(history, [value], isEqual);
        this.history = take([value, ...history], maxHistoryLength);
        this.provider.write({history: this.history});
    }
}

/**
 * @typedef {Object} FilterChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true to include value, as filters (default true)
 * @property {boolean} [persistHistory] - true to include history (default true)
 */