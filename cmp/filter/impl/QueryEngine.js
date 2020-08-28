/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter} from '@xh/hoist/data';
import {
    escapeRegExp,
    isEmpty,
    isNaN,
    isNil,
    sortBy,
    flatMap
} from 'lodash';

/**
 * Provide the querying support for FilterChooserModel.
 *
 *  @private
 *
 * Process the user typed query, FieldSpecs, and FilterChooserModel to come up with a sorted list
 * of auto-complete options to be displayed to the user.
 */
export class QueryEngine {

    model;

    constructor(model) {
        this.model = model;
    }

    //-----------------------------------------------------------------
    // Main entry point
    //
    // Returns a set of options appropriate for react-select to display.
    // Options will be one of the following, returned in the order below:
    //  - suggestion, a suggested FilterChooserFieldSpec, to prompt the user further.
    //  - filter, a fully specified FieldFilter ready to be added to the value:
    //-----------------------------------------------------------------
    async queryAsync(query) {
        return this.sortByQuery(this.filterByQuery(query), query);
    }

    //-----------------------
    // Implementation
    //---------------------
    filterByQuery(query) {
        const {model} = this;
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
            ret = [];

        // 1) Provide filter options
        if (!queryOp || valueOps.includes(queryOp)) {
            ret.push(...this.getOptionsForValueQuery(queryField, queryValue, queryOp));
        } else if (rangeOps.includes(queryOp)) {
            ret.push(...this.getOptionsForRangeQuery(queryField, queryValue, queryOp));
        }

        // 2) Provide suggestions for field specs that partially match the query.
        if (isEmpty(queryValue) || isEmpty(ret)) {
            const suggestions = model.fieldSpecs
                .filter(spec => spec.displayName.toLowerCase().startsWith(queryField.toLowerCase()))
                .map(spec => model.createSuggestionOption(spec));
            ret.push(...suggestions);
        }


        return ret;
    }

    getOptionsForValueQuery(queryField, queryValue, queryOp) {
        const fullQuery = queryOp && !isEmpty(queryField) && !isEmpty(queryValue),
            op = queryOp ?? '=', // If no operator included in query, assume '='
            ret = [];

        const testField = (s) => this.getRegExp('^' + queryField).test(s);
        const testValue = (s) => this.getRegExp('^' + queryValue).test(s);
        const specs = this.model.fieldSpecs.filter(spec => {
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
                    const valueMatches = fullQuery ? testValue(value) : testField(value);
                    if (nameMatches || valueMatches) {
                        ret.push(this.createFilterOption(spec, op, value));
                    }
                });
            } else if (fullQuery) {
                // For filters which require a fully spec'ed query, create an option with the value.
                const value = spec.parseValue(queryValue, op);
                if (!isNil(value) && !isNaN(value)) {
                    ret.push(this.createFilterOption(spec, op, value));
                }
            }
        });

        return ret;
    }

    getOptionsForRangeQuery(queryField, queryValue, queryOp) {
        if (!queryOp || isEmpty(queryValue)) return [];

        const op = queryOp;
        const testField = (s) => this.getRegExp('^' + queryField).test(s);
        const specs = this.model.fieldSpecs.filter(spec => {
            return spec.isRangeType && spec.supportsOperator(op) && testField(spec.displayName);
        });

        return flatMap(specs, spec => {
            const value = spec.parseValue(queryValue, op);
            return !isNil(value) && !isNaN(value) ? this.createFilterOption(spec, op, value) : [];
        });
    }

    createFilterOption(spec, op, value) {
        return this.model.createFilterOption(new FieldFilter({field: spec.field, op, value}));
    }

    getRegExp(pattern) {
        return new RegExp(pattern, 'i');
    }

    sortByQuery(options, query) {
        if (!query) return options;

        const sortRe = this.getRegExp('^' + query),
            queryLength = query.length;

        return sortBy(options, ({displayName, filter, op}) => {
            const value = filter?.value,
                fieldExact = displayName && sortRe.test(displayName) && queryLength === displayName.length,
                valueExact = value && sortRe.test(value) && queryLength === value.length;

            // Suggestions go first, field and value exact matches boosted as well.
            const suggestPriority = !op ? '0-' : '1-',
                fieldPriority = fieldExact ? '0-'+displayName : '1-'+displayName,
                valuePriority = valueExact ? '0-'+value : '1-'+value;

            return `${suggestPriority}-${fieldPriority}-${valuePriority}`;
        });
    }
}
