/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel, managed, PersistenceProvider} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {action, observable, computed} from '@xh/hoist/mobx';
import {FilterOptionsModel} from '@xh/hoist/data';
import {ValueFilter} from '@xh/hoist/data/cube/filter/ValueFilter';
import {throwIf} from '@xh/hoist/utils/js';
import {differenceWith, isEmpty, isEqual, isPlainObject, sortBy, take} from 'lodash';

@HoistModel
export class FilterFieldModel {

    @observable.ref value;
    @observable.ref history;

    // Immutable properties
    filterOptionsModel = null;
    limit = null;
    maxHistoryLength = null;

    @managed provider;

    /**
     * @param c - FilterFieldModel configuration.
     * @param {(FilterOptionsModel|Object)} filterOptionsModel - FilterOptionsModel, or config to create one.
     * @param {number} [c.limit] - maximum number of results to show before truncating.
     * @param {PersistOptions} [c.persistWith] - options governing history persistence
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by the control on a FIFO basis).
     */
    constructor({
        filterOptionsModel,
        limit,
        persistWith,
        maxHistoryLength = 5
    }) {
        throwIf(!filterOptionsModel, 'Must a FilterOptionsModel (or a config to create one)');

        this.filterOptionsModel = isPlainObject(filterOptionsModel) ?
            new FilterOptionsModel(filterOptionsModel) :
            filterOptionsModel;

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

    /**
     * Selected filters as ValueFilters, ready for use with Cube
     * @returns {ValueFilter[]}
     */
    @computed
    get valueFilters() {
        return this.value?.map(it => {
            const [fieldName, value] = it.split(':');
            return new ValueFilter(fieldName, value);
        });
    }

    /**
     * Convenience method for setting value from an array of Cube ValueFilters.
     * @param {ValueFilter[]} valueFilters
     */
    setValueFilters(valueFilters) {
        const value = valueFilters?.map(it => `${it.fieldName}:${it.values[0]}`) ?? [];
        this.setValue(value);
    }

    @action
    setValue(value) {
        this.value = value;
        this.addToHistory(value);
    }

    //--------------------
    // Querying
    //--------------------
    get options() {
        const fieldSpecs = this.filterOptionsModel.specs.filter(it => it.type === 'value'),
            ret = [];

        fieldSpecs.forEach(f => {
            const {name, displayName, values} = f;
            values.forEach(v => {
                const {value, displayValue} = v;
                ret.push({
                    displayName,
                    displayValue,
                    value: name + ':' + value,
                    label: displayName + ': ' + displayValue
                });
            });
        });

        return ret;
    }

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
        const {options} = this,
            sep = ':';

        if (!query || !query.length) return [];

        // Handle space after : separator
        query = query.replace(sep + ' ', sep);
        const sepIdx = query.indexOf(sep);

        if (sepIdx > -1) {
            // Matching for advanced usage where type:value is specified, with partial matching for either side.
            const facetStr = query.substr(0, sepIdx),
                facetRe = facetStr ? new RegExp('\\b' + facetStr, 'i') : null,
                valStr = query.substr(sepIdx + 1),
                valRe = valStr ? new RegExp('\\b' + valStr, 'i') : null;

            return options.filter(f => {
                const {displayName, value} = f;
                return (
                    (!facetRe || facetRe.test(displayName)) &&
                    (!valRe || valRe.test(value))
                );
            });
        } else {
            // Separator not used - match against both name and value to catch both possibilities
            const regex = new RegExp('\\b' + query, 'i');
            return options.filter(f => {
                const {displayName, value} = f;
                return regex.test(displayName + sep + value);
            });
        }
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