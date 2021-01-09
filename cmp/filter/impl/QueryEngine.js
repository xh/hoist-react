/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter} from '@xh/hoist/data';
import {fieldOption, filterOption, msgOption} from './Option';
import {fmtNumber} from '@xh/hoist/format';

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

        //-----------------------------------------------------------------------
        // We respond in four primary states, described and implemented below.
        //-----------------------------------------------------------------------
        let ret = [];
        if (q.field && !q.op) {
            ret = this.openSearching(q);
        } else if (q.field && q.op === 'is') {
            ret = this.withIsSearchingOnField(q);
        } else if (q.field && q.op) {
            ret = this.valueSearchingOnField(q);
        } else if (!q.field && q.op && q.value) {
            ret = this.valueSearchingOnAll(q);
        }

        return castArray(ret);
    }

    //------------------------------------------------------------------------
    // 1) No op yet, so field not fixed -- get field or value matches.
    //------------------------------------------------------------------------
    openSearching(q) {
        // Get main field suggestions
        let ret = this.getFieldOpts(q.field);

        // Potentially provide some additional match ideas
        if (ret.length === 1) {
            // user clearly on a path to a single field, drilldown on it with = and an empty search
            ret.push(...this.getValueMatchesForField('=', '', ret[0].fieldSpec));
        } else {
            // field search ongoing with options above.
            // But in case user looking for values, try a general search with = and the text given
            this.fieldSpecs.forEach(spec => {
                ret.push(...this.getValueMatchesForField('=', q.field, spec));
            });
        }

        ret = this.sortAndTruncate(ret);

        return isEmpty(ret) ? msgOption(`No matches found for '${q.field}'`) : ret;

    }

    //--------------------------------------------------------
    // 2) Op is the psuedo 'is' operator and field is set
    //-------------------------------------------------------
    withIsSearchingOnField(q) {
        const spec = find(this.fieldSpecs, s => caselessEquals(s.displayName, q.field));
        if (!spec) return msgOption(`No matching field found for '${q.field}'`);

        const ret = [];
        ['empty', 'not empty'].forEach(value => {
            if (caselessStartsWith(value, q.value)) {
                const op = value.startsWith('not') ? '!=' : '=';
                value = [null, ''];
                ret.push(
                    filterOption({
                        filter: new FieldFilter({field: spec.field, op, value}),
                        fieldSpec: spec,
                        isExact: true
                    })
                );
            }
        });
        return isEmpty(ret) ?
            msgOption(`The 'is' operator supports 'empty' or 'not empty'`) :
            ret;
    }

    //----------------------------------------------------------------------------------
    // 3) We have an op and our field is set -- produce suggestions on that field
    //----------------------------------------------------------------------------------
    valueSearchingOnField(q) {
        const spec = find(this.fieldSpecs, s => caselessEquals(s.displayName, q.field));

        // Validation
        if (!spec) return msgOption(`No matching field found for '${q.field}'`);
        if (!spec.supportsOperator(q.op)) {
            const valid = spec.ops.map(it => "'" + it + "'").join(', ');
            return msgOption(`'${spec.displayName}' does not support '${q.op}'.  Use ${valid}`);
        }

        let ret = [];

        // Get suggestions if supported
        const supportsSuggestions = spec.supportsSuggestions(q.op);
        if (supportsSuggestions) {
            ret = this.getValueMatchesForField(q.op, q.value, spec);
            ret = this.sortAndTruncate(ret);
        }
        // Add query value itself if needed and allowed
        const value = spec.parseValue(q.value),
            valueValid = !isNaN(value) && !isNil(value) && value !== '',
            {forceSelection, suggestValues} = spec;
        if (valueValid &&
            (!forceSelection || !supportsSuggestions) &&
            ret.every(it => it.filter?.value !== value)) {
            ret.push(
                filterOption({
                    filter: new FieldFilter({field: spec.field, op: q.op, value}),
                    fieldSpec: spec
                })
            );
        }

        // Errors
        if (isEmpty(ret)) {
            // No input and no suggestions coming. Keep template up and encourage user to type!
            if (q.value === '' || !suggestValues) {
                ret.push(fieldOption({fieldSpec: spec}));
            }

            // If we had valid input and can suggest, empty is a reportable problem
            if (q.value !== '' && valueValid && suggestValues) {
                ret.push(msgOption('No matches found'));
            }
        }

        return ret;
    }

    //------------------------------------------------------------------------------------------
    // 4) We have an op and a value but no field-- look in *all* fields for matching candidates
    //-------------------------------------------------------------------------------------------
    valueSearchingOnAll(q) {
        let ret = flatMap(this.fieldSpecs, spec => this.getValueMatchesForField(q.op, q.value, spec));
        ret = this.sortAndTruncate(ret);

        return isEmpty(ret) ? msgOption('No matches found'): ret;
    }


    //-------------------------------------------------
    // Helpers to produce suggestions
    //-------------------------------------------------
    getFieldOpts(queryStr) {
        return this.fieldSpecs
            .filter(s => caselessStartsWith(s.displayName, queryStr))
            .map(s => fieldOption({fieldSpec: s, isExact: caselessEquals(s.displayName, queryStr)}));
    }

    getValueMatchesForField(op, queryStr, spec) {
        if (!spec.supportsSuggestions(op)) return [];

        let {values, suggestValues} = spec;

        const value = spec.parseValue(queryStr),
            testFn = isFunction(suggestValues) ?
                suggestValues(queryStr, value) :
                defaultSuggestValues(queryStr, value);

        // assume spec will not produce dup values.  React-select will de-dup identical opts as well
        const ret = [];
        values.forEach(v => {
            const formattedValue = spec.renderValue(v);
            if (testFn(formattedValue, v)) {
                ret.push(
                    filterOption({
                        filter: new FieldFilter({field: spec.field, op, value: v}),
                        fieldSpec: spec,
                        isExact: value === v || caselessEquals(formattedValue, queryStr)
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

        // 'is' is a pseudo operator, both is and like need word boundaries
        const ops = FieldFilter.OPERATORS.filter(it => it != 'like');
        const operatorRegs = sortBy(ops, o => -o.length).map(escapeRegExp);
        operatorRegs.push('\\blike\\b');
        operatorRegs.push('\\bis\\b');

        let [field = '', op = '', value = ''] = raw
            .split(new RegExp('(' + operatorRegs.join('|') + ')', 'i'))
            .map(s => s.trim());

        // Catch special case where some partial operator bits being interpreted as field
        if (!op && field) {

            // catch partial 'like/is/!' at the end of an actual field -- move to operator
            const catchOpSuffix = (suffix, operator) => {
                const reg = new RegExp(suffix, 'i');
                if (field.match(reg)) {
                    const fieldPrefix = field.replace(reg, '').trim();
                    if (this.fieldSpecs.find(f => caselessEquals(f.displayName, fieldPrefix))) {
                        field = fieldPrefix;
                        op = operator;
                    }
                }
            };

            if (!op) catchOpSuffix('( l| li| lik)$', 'like');
            if (!op) catchOpSuffix(' i$', 'is');
            if (!op) catchOpSuffix('!$', '!=');

            // catch '!' alone -- user clearly wants to do some negation queries
            if (!op && field === '!') {
                op = '!=';
                field = '';
            }
        }


        if (!field && !op) return null;

        return {field, op, value};
    }

    sortAndTruncate(results) {
        results = sortBy(results, o => o.type, o => !o.isExact, o => o.label);

        const max = this.model.maxResults;
        return max > 0 && results.length > max ?
            [...results.slice(0, max), msgOption(`${max} of ${fmtNumber(results.length)} results shown`)] :
            results;
    }
}
//----------------------
// Local Helper functions
//------------------------
function caselessStartsWith(target, queryStr) {
    return target?.toString().toLowerCase().startsWith(queryStr?.toString().toLowerCase());
}

function caselessEquals(target, queryStr) {
    return target?.toString().toLowerCase() === queryStr?.toString().toLowerCase();
}

function defaultSuggestValues(queryStr, queryValue) {
    const regexp = new RegExp('\\b' + escapeRegExp(queryStr), 'i');
    return (formattedValue, value) => formattedValue.match(regexp);
}