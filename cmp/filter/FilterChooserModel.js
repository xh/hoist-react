/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FilterChooserFieldSpec} from '@xh/hoist/cmp/filter/impl/FilterChooserFieldSpec';
import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {FieldFilter, parseFilter, parseFieldValue} from '@xh/hoist/data';
import {action, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    compact,
    escapeRegExp,
    flatten,
    groupBy,
    isEmpty,
    isNaN,
    isNil,
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
    @observable.ref value;

    /** @member {Store} */
    store;

    /** @member {FilterChooserFieldSpec[]} */
    @observable.ref fieldSpecs = [];

    /** @member {number} */
    maxResults;

    /** @member {PersistenceProvider} */
    @managed provider;
    persistValue = false;

    // Implementation fields for Control
    @observable.ref selectOptions;
    @observable.ref selectValue;
    inputRef = createObservableRef();

    /** @member {RawFilterChooserFieldSpec[]} */
    _rawFieldSpecs;


    // Option values with special handling
    static TRUNCATED = 'TRUNCATED';
    static SUGGEST_PREFIX = '*SUGGEST*';

    /**
     * @param c - FilterChooserModel configuration.
     * @param {(Filter|* |[])} [c.initialValue] -  Configuration for a filter appropriate to be
     *      shown in this field. Currently this control only edits and creates a flat collection of
     *      FilterFields, to be 'AND' together.
     * @param {Store} c.store - Store to use for Field resolution as well as extraction of available
     *      Record values for field-specific suggestions. Note that configuring the store here does
     *      NOT cause that store to be automatically filtered or otherwise bound to the Filter.
     * @param {(string[]|FilterChooserFieldSpecConfig[])} [c.fieldSpecs] - specifies the Store
     *      Fields this model will support for filtering and customizes how their available values
     *      will be parsed/displayed. Provide simple Field names or `FilterChooserFieldSpecConfig`
     *      objects to select and customize fields available for filtering. Optional - if not
     *      provided, all Store Fields will be included with options defaulted based on their type.
     * @param {number} [c.maxResults] - maximum number of results to show before truncating.
     * @param {FilterChooserPersistOptions} [c.persistWith] - options governing persistence
     */
    constructor({
        initialValue = null,
        store,
        fieldSpecs,
        maxResults = 10,
        persistWith
    }) {
        throwIf(!store, 'Must provide a Store to resolve Fields and provide value suggestions.');

        this.initialValue = initialValue;
        this.store = store;
        this._rawFieldSpecs = this.parseRawFieldSpecs(fieldSpecs);

        this.maxResults = maxResults;

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'filterChooser', ...persistWith});
                this.persistValue = persistWith.persistValue ?? true;

                const state = this.provider.read();
                if (this.persistValue && state?.value) initialValue = state.value;

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
            run: () => this.updateFieldSpecs()
        });
        this.addReaction({
            track: () => this.fieldSpecs,
            run: () => this.updateFieldSpecs
        });

        this.value = this.setValue(initialValue);
    }

    /**
     * Set the value displayed by this control.
     *
     * @param {(Filter|* |[])} value -  Configuration for a filter appropriate to be
     *      shown in this field.
     *
     * Currently this control only supports a flat collection of FilterFields, to
     * be 'AND'ed together. Filter Values that cannot be parsed, or are not supported
     * will cause the control to be cleared.
     */
    @action
    setValue(value) {
        try {
            value = parseFilter(value);
            const fieldFilters = this.toFieldFilters(value),
                options = this.getOptionsForFilters(fieldFilters);
            this.selectOptions = !isEmpty(options) ? options : null;
            this.selectValue = sortBy(fieldFilters.map(f => f.serialize()), f => {
                const idx = this.selectValue?.indexOf(f);
                return isFinite(idx) && idx > -1 ? idx : fieldFilters.length;
            });
            this.value = value;
        } catch (e) {
            console.error('Failed to set value on FilterChoooserModel', e);
            this.value = null;
            this.selectOptions = this.getOptionsForFilters([]);
            this.selectValue = [];
        }
    }

    //--------------------
    // Value Handling/Processing
    //--------------------
    @action
    setSelectValue(selectValue) {
        // Seperate suggestions from actual selected filters.
        const [suggestions, filters] = partition(compact(flatten(selectValue)), v => {
            return v.startsWith(FilterChooserModel.SUGGEST_PREFIX);
        });

        // Re-hydrate and round-trip selected filters through main value setter above.
        this.setValue(this.recombineFilters(filters.map(f => FieldFilter.create(f))));
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
                f.value.map(value => FieldFilter.create({...f, value})) :
                f.value;
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
    // Querying
    //--------------------
    async queryAsync(query) {
        const {maxResults} = this,
            results = this.sortByQuery(this.filterByQuery(query), query);

        if (maxResults > 0 && results.length > maxResults) {
            const truncateCount = results.length - maxResults;
            return [
                ...results.slice(0, maxResults),
                {value: FilterChooserModel.TRUNCATED, truncateCount}
            ];
        }

        return results;
    }

    filterByQuery(query) {
        if (isEmpty(query)) return [];

        // Split query into field, operator and value.
        const operatorReg = sortBy(FieldFilter.OPERATORS, o => -o.length)
            .map(o => escapeRegExp(o))
            .join('|');

        const [queryField, queryOp, queryValue] = query
            .split(this.getRegExp('(' + operatorReg + ')'))
            .map(it => it.trim());

        // Get options for the given query, according to the query type specified by the operator
        const valueOps = ['=', '!=', 'like'],
            rangeOps = ['>', '>=', '<', '<='],
            options = [];

        if (!queryOp || valueOps.includes(queryOp)) {
            options.push(...this.getOptionsForValueQuery(queryField, queryValue, queryOp));
        } else if (rangeOps.includes(queryOp)) {
            options.push(...this.getOptionsForRangeQuery(queryField, queryValue, queryOp));
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

    getOptionsForValueQuery(queryField, queryValue, queryOp) {
        const fullQuery = queryOp && !isEmpty(queryField) && !isEmpty(queryValue),
            op = queryOp ?? '=', // If no operator included in query, assume '='
            options = [];

        const testField = (s) => this.getRegExp(queryField).test(s);
        const testValue = (s) => this.getRegExp(queryValue).test(s);
        const specs = this.fieldSpecs.filter(spec => {
            if (!spec.supportsOperator(op)) return false;

            // Value filters provide options based only on partial field match.
            // Range filters support value operators (e.g. '=', '!='). Must provide full query.
            return spec.isValueType ?
                !fullQuery || testField(spec.displayName) :
                fullQuery && testField(spec.displayName);
        });

        specs.forEach(spec => {
            const {displayName, values} = spec;

            if (values && ['=', '!='].includes(op)) {
                const nameMatches = testField(displayName);
                values.forEach(value => {
                    // Where both field and value specified use partial match for either side
                    // If only one part provided just match against both together
                    const match = fullQuery ?
                        nameMatches && testValue(value) :
                        testField(displayName + ' ' + value);

                    if (match) {
                        options.push(this.createOption({spec, value, op}));
                    }
                });
            } else if (fullQuery) {
                // For filters which require a fully spec'ed query, create an option with the value.
                const value = spec.parseValue(queryValue, op);
                if (!isNil(value) && !isNaN(value)) {
                    options.push(this.createOption({spec, value, op}));
                }
            }
        });

        return options;
    }

    getOptionsForRangeQuery(queryField, queryValue, queryOp) {
        if (!queryOp || isEmpty(queryValue)) return [];

        const op = queryOp,
            options = [];

        const testField = (s) => this.getRegExp(queryField).test(s);
        const specs = this.fieldSpecs.filter(spec => {
            return spec.isRangeType && spec.supportsOperator(op) && testField(spec.displayName);
        });

        specs.forEach(spec => {
            const value = spec.parseValue(queryValue, op);
            if (!isNil(value) && !isNaN(value)) {
                options.push(this.createOption({spec, value, op}));
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
                const {op} = filter,
                    value = parseFieldValue(filter.value, spec.fieldType, null);
                options.push(this.createOption({spec, value, op, filter}));
            }
        });

        return options;
    }

    createOption({spec, value, op, filter}) {
        const {displayName, field} = spec,
            displayValue = spec.renderValue(value);

        filter = FieldFilter.create(filter ?? {field, op, value});

        return {
            displayName,
            displayValue,
            op,
            value: filter.serialize(),
            label: `${displayName} ${op} ${displayValue}`
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

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret = {};
        if (this.persistValue) ret.value = this.value;
        return ret;
    }

    //--------------------------------
    // FilterChooserFieldSpec handling
    //--------------------------------
    @action
    updateFieldSpecs() {
        const {store, _rawFieldSpecs} = this;

        this.fieldSpecs = _rawFieldSpecs.map(rawSpec => {
            return new FilterChooserFieldSpec({
                ...rawSpec,
                storeRecords: store.allRecords
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
 * @typedef {Object} RawFilterChooserFieldSpec - partially processed spec for internal use by this
 *     class. Identical to `FilterChooserFieldSpecConfig` but with resolved `Field` instance.
 * @property {Field} field
 * @property {string} displayName
 * @property {string[]} ops
 * @property {boolean} suggestValues
 * @property {[]} values
 * @property {FilterOptionValueRendererCb} [valueRenderer]
 * @property {FilterOptionValueParserCb} [valueParser]
 * @property {*} [exampleValue]
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
 * @property {boolean} [persistValue] - true (default) to include value (serialized filters)
 */
