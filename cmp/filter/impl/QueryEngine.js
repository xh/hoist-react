/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter} from '@xh/hoist/data';
import {fieldOption, filterOption, msgOption} from './Option';

import {
    escapeRegExp,
    isEmpty,
    isNaN,
    isNil,
    sortBy,
    flatMap,
    find,
    castArray,
    isFunction
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
    //-----------------------------------------------------------------
    async queryAsync(query) {
        const q = this.getDecomposedQuery(query);
        if (!q) return [];

        const ret = this.getOpts(q);

        return sortBy(castArray(ret), 'type', o => !o.isExact, 'label');
    }

    //---------------------
    // Implementation
    //---------------------

    //-----------------------------------------------------------------------
    // We respond in three primary states, described and implemented below.
    //-----------------------------------------------------------------------
    getOpts(q) {

        if (q.field && !q.op) return this.getFieldOpts(q);
        if (q.field && q.op)  return this.getSingleFieldFilterOpts(q);
        if (!q.field && q.op && q.value) return this.getAllFieldFilterOpts(q);

        return [];
    }

    //------------------------------------------------------
    // 1) No op yet, so field not fixed -- get field matches.
    //-----------------------------------------------------
    getFieldOpts(q) {
        const ret = this.fieldSpecs
            .filter(s => caselessStartsWith(s.displayName, q.field))
            .map(s => fieldOption({fieldSpec: s, isExact: caselessEquals(s.displayName, q.field)}));

        return !isEmpty(ret) ? ret : msgOption(`No matching fields found for '${q.field}'`);
    }


    //---------------------------------------------------------------------------
    // 2) We have an op and our field is set -- want limited suggestions on that!
    //------------------------------------------------------------------------------
    getSingleFieldFilterOpts(q) {
        const spec = find(this.fieldSpecs, s => caselessEquals(s.displayName, q.field));

        // Validation
        if (!spec) {
            return msgOption(`No matching fields found for '${q.field}'`);
        }
        if (!spec.supportsOperator(q.op)) {
            const valid = spec.ops.map(it => "'" + it + "'").join(', ');
            return msgOption(`'${spec.displayName}' does not support '${q.op}'.  Use ${valid}`);
        }

        // First get value matches.
        const ret = this.getValueMatchesForField(q, spec);

        // Add query value itself if needed and allowed
        const value = spec.parseValue(q.value),
            valueValid = !isNaN(value) && !isNil(value) && value !== '',
            {forceSelection, suggestValues} = spec;
        if (valueValid &&
            (!forceSelection || !q.isEqualityQuery) &&
            ret.every(it => it.filter?.value !== value)) {
            ret.push(
                filterOption({
                    filter: new FieldFilter({field: spec.field, op: q.op, value}),
                    fieldSpec: spec
                })
            );
        }


        if (isEmpty(ret)) {
            // No input, and no suggestions coming. Keep template up and encourage user to type!
            if (q.value === '' || !suggestValues) {
                ret.push(fieldOption({fieldSpec: spec, isExact: true}));
            }

            // ... if we had valid input, a lack of expected suggestions a reportable problem
            if (q.value !== '' && valueValid && suggestValues) {
                ret.push(msgOption('No matches found'));
            }
        }

        return ret;
    }

    //------------------------------------------------------------------------------------------
    // 3) We have an op, but no field.-- look in *all* fields for matching candidates
    //-------------------------------------------------------------------------------------------
    getAllFieldFilterOpts(q) {
        return flatMap(this.fieldSpecs, spec => this.getValueMatchesForField(q, spec));
    }

    //---------------------------------------------------------
    // Main utility to get value suggestions for a given field
    //--------------------------------------------------------
    getValueMatchesForField(q, spec) {
        let {values, suggestValues} = spec;
        if (!values || !suggestValues|| !q.isEqualityQuery || !spec.supportsOperator(q.op)) {
            return [];
        }

        const value = spec.parseValue(q.value),
            testFn = isFunction(suggestValues) ?
                suggestValues(q.value, value) :
                defaultSuggestValues(q.value, value);

        // assume spec will not produce dup values.  React-select will de-dup identical opts as well
        const ret = [];
        values.forEach(v => {
            const formattedValue = spec.renderValue(v);
            if (testFn(formattedValue, v)) {
                ret.push(
                    filterOption({
                        filter: new FieldFilter({field: spec.field, op: q.op, value: v}),
                        fieldSpec: spec,
                        isExact: value === v || caselessEquals(q.value, formattedValue)
                    })
                );
            }
        });
        return ret;
    }

    get fieldSpecs() {
        return this.model.fieldSpecs;
    }

    getDecomposedQuery(raw) {
        if (isEmpty(raw)) return null;
        const operatorReg = sortBy(FieldFilter.OPERATORS, o => -o.length)
            .map(escapeRegExp)
            .join('|');
        let [field = '', op = '', value = ''] = raw
            .split(new RegExp('(' + operatorReg + ')', 'i'))
            .map(s => s.trim());

        // Catch special case where some partial operator bits being interpreted as field
        if (!op && field) {
            // root of like at the end of field, with a space
            const likeTailReg = new RegExp('( l| li| lik)$', 'i');
            if (field.match(likeTailReg)) {
                field = field.replace(likeTailReg, '');
                op = 'like';
            }
            // ! at the end of field
            const neTailReg = new RegExp('!$', 'i');
            if (field.match(neTailReg)) {
                field = field.replace(neTailReg, '');
                op = '!=';
            }
        }

        if (!field && !op) return null;

        return {
            field,
            op,
            value,
            isEqualityQuery: ['=', '!='].includes(op)
        };
    }
}

//----------------------
// Local Helper functions
//------------------------
function caselessStartsWith(target, query) {
    return target?.toString().toLowerCase().startsWith(query?.toString().toLowerCase());
}

function caselessEquals(target, query) {
    return target?.toString().toLowerCase() === query?.toString().toLowerCase();
}

function defaultSuggestValues(queryString, queryValue) {
    const regexp = new RegExp('\\b' + escapeRegExp(queryString), 'i');
    return (formattedValue, value) => formattedValue.match(regexp);
}