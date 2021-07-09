/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BaseFieldSpec} from '@xh/hoist/data/filter/BaseFieldSpec';
import {FieldType, parseFieldValue} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {isFunction, isString, isNil} from 'lodash';

/**
 * In addition to the BaseFieldSpec, includes configuration for data values available for suggestion.
 *
 * Apps should NOT instantiate this class directly. Instead {@see FilterChooserModel.fieldSpecs}
 * for the relevant config to set these options.
 */
export class FilterChooserFieldSpec extends BaseFieldSpec {

    /** @member {?Array} - data values available for suggestion. */
    values;

    /** @member {(boolean|SuggestValuesCb)} */
    suggestValues;

    /** @member {boolean} */
    forceSelection;

    /** @member {FieldSpecValueRendererCb} */
    valueRenderer;

    /** @member {FieldSpecValueParserCb} */
    valueParser;

    /** @member {string} */
    example;

    /**
     * @param {Object} c - FilterChooserFieldSpec configuration.
     * @param {*[]} [c.values] - explicit list of available values for this field.
     * @param {(boolean|SuggestValuesCb)} [c.suggestValues] - true to provide
     *      auto-complete options with enumerated matches when user specifies '=', or'!='.
     *      Defaults to true for enumerable fieldTypes, otherwise false.  May be also
     *      specified as the function to be used for the matching. (If true a default "word start"
     *      matching against the formatted value will be used.)
     * @param {boolean} [c.forceSelection] - true to require value entered to be an available value
     *      for '=' and '!=' operators. Defaults to false.
     * @param {FieldSpecValueRendererCb} [c.valueRenderer] - function to produce a suitably
     *      formatted string for display to the user for any given field value.
     * @param {FieldSpecValueParserCb} [c.valueParser] - function to parse user's input from a
     *      filter chooser control into a typed data value for use in filtering comparisons.
     * @param {string} [c.example] - sample / representative value displayed by `FilterChooser`
     *      components to aid usability
     * @param {*} [c...rest] - arguments for BaseFieldSpec.
     */
    constructor({
        values,
        suggestValues,
        forceSelection,
        valueRenderer,
        valueParser,
        example,
        ...rest
    }) {
        super(rest);

        this.suggestValues = suggestValues ?? this.isEnumerable;
        this.forceSelection = forceSelection ?? false;
        this.valueRenderer = valueRenderer;
        this.valueParser = valueParser;
        this.example = this.parseExample(example);
        this.loadValues(values);

        throwIf(
            !this.values && forceSelection,
            `Must provide lookup values for field '${this.field}', or set forceSelection to false.`
        );

        throwIf(
            !this.valueParser && this.fieldType === FieldType.DATE,
            "Must provide an appropriate valueParser arg for fields with type 'date'"
        );
    }

    /**
     * @param {string} op
     * @returns {boolean}
     */
    supportsSuggestions(op) {
        return this.values &&
            this.suggestValues &&
            this.supportsOperator(op) &&
            (op === '=' || op === '!=');
    }

    renderValue(value, op) {
        let ret;
        if (isFunction(this.valueRenderer)) {
            ret = this.valueRenderer(value, op);
        } else if (this.isDateBasedFieldType) {
            ret = fmtDate(value);
        } else {
            ret = value?.toString();
        }
        return stripTags(ret);
    }

    parseValue(value, op) {
        try {
            const {fieldType} = this;

            if (isFunction(this.valueParser)) {
                return this.valueParser(value, op);
            }

            // Special handling for default localDate to supports user entering dash-separated dates,
            // which is likely given that we show resolved dates in that format.
            if (fieldType === FieldType.LOCAL_DATE && isString(value)) {
                return LocalDate.get(value.replace(/-/g, ''));
            }

            return parseFieldValue(value, fieldType, undefined);
        } catch (e) {
            return undefined;
        }
    }

    //------------------------
    // Implementation
    //------------------------
    loadValues(values) {
        if (values) {
            this.values = values;
            return;
        }

        if (this.isBoolFieldType) {
            this.values = [true, false];
            return;
        }

        if (this.source && this.sourceField && (this.suggestValues || this.forceSelection)) {
            this.addReaction({
                track: () => this.source.lastUpdated,
                run: () => this.loadValuesFromSource(),
                fireImmediately: true
            });
        }
    }

    parseExample(example) {
        if (example) return example;
        if (this.isBoolFieldType) return 'true | false';
        if (this.isDateBasedFieldType) return 'YYYY-MM-DD';
        if (this.isNumericFieldType) return this.renderValue(1234);
        return 'value';
    }

    loadValuesFromSource() {
        const {field, source} = this,
            values = new Set();

        // Note use of unfiltered recordset here to source suggest values. This allows chooser to
        // suggest values from already-filtered fields that will expand the results when selected.
        const sourceStore = source.isView ? source.cube.store : source;
        sourceStore.allRecords.forEach(rec => {
            const val = rec.get(field);
            if (!isNil(val)) values.add(val);
        });

        this.values = Array.from(values);
    }
}

/**
 * @callback SuggestValuesCb - a function to be run against all values returned by
 *      the fieldSpecs values getter to determine if they should be considered suggestions.
 * @param {string} query - raw user query
 * @param {*} parsedQuery - parsed user query (or undefined, if parsing failed)
 * @return {function} - a test function taking a formatted value and value, and
 *      returning a boolean, if the value should be considered a match for query.
 */

/**
 * @callback FieldSpecValueRendererCb
 * @param {*} value
 * @param {string} op
 * @return {string} - formatted value suitable for display to the user.
 */

/**
 * @callback FieldSpecValueParserCb
 * @param {string} input
 * @param {string} op
 * @return {*} - the parsed value.
 */