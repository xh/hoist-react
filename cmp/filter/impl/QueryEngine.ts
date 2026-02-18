/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Some} from '@xh/hoist/core';
import {FieldFilter} from '@xh/hoist/data';
import {fmtNumber} from '@xh/hoist/format';
import {
    castArray,
    escapeRegExp,
    find,
    flatMap,
    isEmpty,
    isNaN,
    isNil,
    sortBy,
    without
} from 'lodash';
import {
    fieldFilterOption,
    fieldOption,
    FilterChooserOption,
    minimalFieldOption,
    msgOption
} from './Option';
import {FilterChooserModel} from '../FilterChooserModel';
import {FilterChooserFieldSpec} from '../FilterChooserFieldSpec';

/**
 * Provide the querying support for FilterChooserModel.
 *
 * @internal
 *
 * Process the user typed query, FieldSpecs, and FilterChooserModel to come up with a sorted list
 * of auto-complete options to be displayed to the user.
 */
export class QueryEngine {
    model: FilterChooserModel;

    constructor(model: FilterChooserModel) {
        this.model = model;
    }

    //-----------------------------------------------------------------
    // Main entry point
    //
    // Returns a set of options appropriate for react-select to display.
    //-----------------------------------------------------------------
    async queryAsync(query: string): Promise<FilterChooserOption[]> {
        const q = this.getDecomposedQuery(query);

        //-----------------------------------------------------------------------
        // We respond in five primary states, described and implemented below.
        //-----------------------------------------------------------------------
        if (!q) {
            return this.whenNoQuery();
        } else if (q.field && !q.op) {
            return castArray(this.openSearching(q));
        } else if (q.field && q.op === 'is') {
            return castArray(this.withIsSearchingOnField(q));
        } else if (q.field && q.op) {
            return castArray(this.valueSearchingOnField(q));
        } else if (!q.field && q.op && q.value) {
            return castArray(this.valueSearchingOnAll(q));
        }
        return [];
    }

    //------------------------------------------------------------------------
    // 1) No query -- return all field suggestions if enabled
    //------------------------------------------------------------------------
    whenNoQuery(): FilterChooserOption[] {
        const {suggestFieldsWhenEmpty, sortFieldSuggestions, introHelpText} = this.model;
        if (!suggestFieldsWhenEmpty) return [];

        let ret = this.getMinimalFieldOpts();
        if (sortFieldSuggestions) ret = this.sort(ret);

        if (introHelpText) {
            ret.unshift(msgOption(introHelpText as string));
        }

        return ret;
    }

    //------------------------------------------------------------------------
    // 2) No op yet, so field not fixed -- get field or value matches.
    //------------------------------------------------------------------------
    openSearching(q): Some<FilterChooserOption> {
        // Suggest matching *fields* for the user to select on their way to a more targeted query.
        let ret = this.getFieldOpts(q.field);

        // If a single field matches, reasonable to assume user is looking to search on it.
        // Suggest *all values from that field* for immediate selection with the = operator.
        if (ret.length === 1) {
            ret.push(...this.getValueMatchesForField('=', '', ret[0].fieldSpec));
        }

        // Also suggest *matching values* across all suggest-enabled fields to support the user
        // searching for a value directly, without them needing to type or select a field name.
        this.fieldSpecs.forEach(spec => {
            ret.push(...this.getValueMatchesForField('=', q.field, spec));
        });

        ret = this.sortAndTruncate(ret);

        return isEmpty(ret) ? msgOption(`No matches found for '${q.field}'`) : ret;
    }

    //--------------------------------------------------------
    // 3) Op is the psuedo 'is' operator and field is set
    //-------------------------------------------------------
    withIsSearchingOnField(q): Some<FilterChooserOption> {
        const spec = find(this.fieldSpecs, s => caselessEquals(s.displayName, q.field));
        if (!spec) return msgOption(`No matching field found for '${q.field}'`);

        const ret = [];
        ['blank', 'not blank'].forEach(value => {
            if (caselessStartsWith(value, q.value)) {
                const op = value.startsWith('not') ? '!=' : '=';
                value = null;
                ret.push(
                    fieldFilterOption({
                        filter: new FieldFilter({field: spec.field, op, value}),
                        fieldSpec: spec,
                        isExact: true
                    })
                );
            }
        });
        return isEmpty(ret) ? msgOption(`The 'is' operator supports 'blank' or 'not blank'`) : ret;
    }

    //----------------------------------------------------------------------------------
    // 4) We have an op and our field is set -- produce suggestions on that field
    //----------------------------------------------------------------------------------
    valueSearchingOnField(q): Some<FilterChooserOption> {
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
        const value = spec.parseValue(q.value, q.op),
            valueValid = !isNaN(value) && !isNil(value) && value !== '',
            {forceSelection, enableValues} = spec;

        if (
            valueValid &&
            (!forceSelection || !supportsSuggestions) &&
            ret.every(it => it.filter?.value !== value)
        ) {
            ret.push(
                fieldFilterOption({
                    filter: new FieldFilter({field: spec.field, op: q.op, value}),
                    fieldSpec: spec
                })
            );
        }

        // Errors
        if (isEmpty(ret)) {
            // No input and no suggestions coming. Keep template up and encourage user to type!
            if (q.value === '' || !enableValues) {
                ret.push(fieldOption({fieldSpec: spec}));
            }

            // If we had valid input and can suggest, empty is a reportable problem
            if (q.value !== '' && valueValid && enableValues) {
                ret.push(msgOption('No matches found'));
            }
        }

        return ret;
    }

    //------------------------------------------------------------------------------------------
    // 5) We have an op and a value but no field-- look in *all* fields for matching candidates
    //-------------------------------------------------------------------------------------------
    valueSearchingOnAll(q): Some<FilterChooserOption> {
        let ret = flatMap(this.fieldSpecs, spec =>
            this.getValueMatchesForField(q.op, q.value, spec)
        );
        ret = this.sortAndTruncate(ret);

        return isEmpty(ret) ? msgOption('No matches found') : ret;
    }

    //-------------------------------------------------
    // Helpers to produce suggestions
    //-------------------------------------------------
    getFieldOpts(queryStr): FilterChooserOption[] {
        const testFn = createWordBoundaryTest(queryStr);
        return this.fieldSpecs
            .filter(s => !queryStr || testFn(s.displayName))
            .map(s =>
                fieldOption({
                    fieldSpec: s,
                    isExact: caselessEquals(s.displayName, queryStr)
                })
            );
    }

    getMinimalFieldOpts(): FilterChooserOption[] {
        return this.fieldSpecs.map(fieldSpec => minimalFieldOption({fieldSpec}));
    }

    getValueMatchesForField(op, queryStr, spec): FilterChooserOption[] {
        if (!spec.supportsSuggestions(op)) return [];

        const {values, field} = spec,
            value = spec.parseValue(queryStr, '='),
            testFn = createWordBoundaryTest(queryStr);

        // assume spec will not produce dup values.  React-select will de-dup identical opts as well
        const ret = [];
        values.forEach(v => {
            const formattedValue = spec.renderValue(v, '=');
            if (testFn(formattedValue)) {
                ret.push(
                    fieldFilterOption({
                        filter: new FieldFilter({field, op, value: v}),
                        fieldSpec: spec,
                        isExact: value === v || caselessEquals(formattedValue, queryStr)
                    })
                );
            }
        });
        return ret;
    }

    get fieldSpecs(): FilterChooserFieldSpec[] {
        return this.model.fieldSpecs;
    }

    getDecomposedQuery(raw: string): any {
        if (isEmpty(raw)) return null;

        // 'is' is a pseudo operator, both is and like need word boundaries
        const ops = without(FieldFilter.OPERATORS, 'like', 'not like', 'begins', 'ends');
        const operatorRegs = sortBy(ops, o => -o.length).map(escapeRegExp);
        operatorRegs.push('\\blike\\b');
        operatorRegs.push('\\bnot like\\b');
        operatorRegs.push('\\bbegins\\b');
        operatorRegs.push('\\bends\\b');
        operatorRegs.push('\\bis\\b');

        let [field = '', op = '', value = ''] = raw
            .split(new RegExp('(' + operatorRegs.join('|') + ')', 'i'))
            .map(s => s.trim());

        // Catch special case where some partial operator bits being interpreted as field
        if (!op && field) {
            // catch partial operator at the end of an actual field -- move to operator
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
            if (!op) catchOpSuffix('( n| no| not| not | not l| not li| not lik)$', 'not like');
            if (!op) catchOpSuffix('( b| be| beg| begi| begin)$', 'begins');
            if (!op) catchOpSuffix('( e| en| end)$', 'ends');
            if (!op) catchOpSuffix(' i$', 'is');
            if (!op) catchOpSuffix('!$', '!=');

            // catch '!' alone -- user clearly wants to do some negation queries
            if (!op && field === '!') {
                op = '!=';
                field = '';
            }
        }

        if (!field && !op) return null;

        op = op.toLowerCase();
        return {field, op, value};
    }

    sortAndTruncate(results: FilterChooserOption[]): FilterChooserOption[] {
        results = this.sort(results);

        const max = this.model.maxResults;
        return max > 0 && results.length > max
            ? [
                  ...results.slice(0, max),
                  msgOption(`${max} of ${fmtNumber(results.length, {asHtml: true})} results shown`)
              ]
            : results;
    }

    sort(results: FilterChooserOption[]): FilterChooserOption[] {
        return sortBy(
            results,
            o => o.type,
            o => !o.isExact,
            o => o.label
        );
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

function createWordBoundaryTest(queryStr) {
    const regexp = new RegExp('\\b' + escapeRegExp(queryStr), 'i');
    return formattedValue => formattedValue.match(regexp);
}
