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
export class FilterFieldModel {

    @observable.ref value;
    @observable.ref history;

    // Immutable properties
    filterModel = null;
    filterOptionsModel = null;
    limit = null;
    maxHistoryLength = null;

    @managed provider;

    /**
     * @param c - FilterFieldModel configuration.
     * @param {(FilterModel|Object)} c.filterModel - FilterModel, or config to create one.
     * @param {(FilterOptionsModel|Object)} c.filterOptionsModel - FilterOptionsModel, or config to create one.
     * @param {number} [c.limit] - maximum number of results to show before truncating.
     * @param {PersistOptions} [c.persistWith] - options governing history persistence
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

        if (isPlainObject(filterModel)) {
            this.filterModel = this.markManaged(new FilterModel(filterModel));
        } else {
            this.filterModel = filterModel;
        }

        if (isPlainObject(filterOptionsModel)) {
            this.filterOptionsModel = this.markManaged(new FilterOptionsModel(filterOptionsModel));
        } else {
            this.filterOptionsModel = filterOptionsModel;
        }

        this.limit = limit;
        this.maxHistoryLength = maxHistoryLength;

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'filterField', ...persistWith});
                const state = this.provider.read();
                if (state?.history) this.history = state.history;
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }
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
        // Convert value to filters
        const filters = this.value?.map(it => Filter.parse(it)) ?? [],
            [valueFilters, rangeFilters] = partition(filters, it => ['=', '!='].includes(it.operator));

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

        // Add to filter model
        this.filterModel.setFilters([
            ...groupedFilters,
            ...rangeFilters
        ]);
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
            return this.filterOptionsForValue(queryField, queryValue, operator);
        } else if (rangeOperators.includes(operator)) {
            return this.filterOptionsForRange(queryField, queryValue, operator);
        }

        return [];
    }

    filterOptionsForValue(queryField, queryValue, operator) {
        const fullQuery = !isEmpty(queryField) && !isEmpty(queryValue),
            options = [];

        const fieldSpecs = this.filterOptionsModel.fieldSpecs.filter(fieldSpec => {
            const {filterType, displayName} = fieldSpec;
            return (
                filterType === 'value' &&
                (!fullQuery || this.getRegExp(queryField).test(displayName))
            );
        });

        fieldSpecs.forEach(fieldSpec => {
            const {field, fieldType, displayName, values} = fieldSpec;
            values.forEach(value => {
                const displayValue = fieldSpec.renderValue(value);

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

    filterOptionsForRange(queryField, queryValue, operator) {
        const fullQuery = !isEmpty(queryField) && !isEmpty(queryValue),
            options = [];

        const fieldSpecs = this.filterOptionsModel.fieldSpecs.filter(fieldSpec => {
            const {filterType, displayName} = fieldSpec;
            return (
                filterType === 'range' &&
                (!fullQuery || this.getRegExp(queryField).test(displayName))
            );
        });

        fieldSpecs.forEach(fieldSpec => {
            const {field, fieldType, displayName} = fieldSpec,
                value = parseFieldValue(fullQuery ? queryValue : queryField, fieldType, null);

            if (isNil(value) || isNaN(value)) return;

            // If both both field and value are specified, only return an option for specified field.
            // Otherwise, return an option for each field
            if (fullQuery) {
                const match = this.getRegExp(queryField).test(displayName);
                if (!match) return;
            }

            const displayValue = fieldSpec.renderValue(value),
                option = {field, value, operator, fieldType, displayName, displayValue};

            options.push(this.createOption(option));
        });

        return options;
    }

    createOption(opt) {
        const {field, value, operator, fieldType, displayName, displayValue} = opt,
            filter = new Filter({field, operator, value, fieldType});

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
            case ':':
            case '=':
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
        if (isEmpty(value)) return;

        // Remove, add to front, and truncate
        let {history, maxHistoryLength} = this;
        history = differenceWith(history, [value], isEqual);
        this.history = take([value, ...history], maxHistoryLength);
        this.provider?.write({history: this.history});
    }
}