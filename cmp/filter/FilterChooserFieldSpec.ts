/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    BaseFilterFieldSpec,
    BaseFilterFieldSpecConfig
} from '@xh/hoist/data/filter/BaseFilterFieldSpec';
import {FieldFilterOperator} from '@xh/hoist/data/filter/Types';
import {parseFieldValue, View} from '@xh/hoist/data';
import {fmtDate, parseNumber} from '@xh/hoist/format';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNil} from 'lodash';
import {isValidElement, ReactNode} from 'react';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';

export interface FilterChooserFieldSpecConfig extends BaseFilterFieldSpecConfig {
    /**
     * Function to produce a suitably formatted string for display to the user
     * for any given field value.
     */
    valueRenderer?: FilterChooserValueRenderer;

    /**
     * Function to parse user's input from a FilterChooser control into a typed data value for
     * use in filtering comparisons.
     */
    valueParser?: FilterChooserValueParser;

    /** Sample / representative value displayed by `FilterChooser` components to aid usability. */
    example?: string;
}

/**
 * Filter field specification class for the typeahead `FilterChooser` component. Manages additional
 * configuration related to data values available for suggestion.
 *
 * Apps should NOT instantiate this class directly. Instead see {@link FilterChooserModel.fieldSpecs}
 * for the relevant config to set these options.
 */
export class FilterChooserFieldSpec extends BaseFilterFieldSpec {
    valueRenderer: FilterChooserValueRenderer;
    valueParser: FilterChooserValueParser;
    example: string;

    /** @internal */
    constructor({valueRenderer, valueParser, example, ...rest}: FilterChooserFieldSpecConfig) {
        super(rest);

        this.valueRenderer = valueRenderer;
        this.valueParser = this.parseValueParser(valueParser);
        this.example = this.parseExample(example);

        if (
            !this.hasExplicitValues &&
            this.source &&
            this.sourceField &&
            (this.enableValues || this.forceSelection)
        ) {
            this.addReaction({
                track: () => this.source.lastUpdated,
                run: () => this.loadValues(),
                // Debounced primarily to minimize impact on UI responsiveness when using this model
                // with a large number of records and/or auto-suggest enabled fields.
                debounce: 100,
                fireImmediately: true
            });
        }

        throwIf(
            !this.values && this.forceSelection,
            `Must provide lookup values for field '${this.field}', or set forceSelection to false.`
        );

        throwIf(
            !this.valueParser && this.fieldType === 'date',
            "Must provide an appropriate valueParser arg for fields with type 'date'"
        );
    }

    renderValue(value: any, op: FieldFilterOperator) {
        let ret;
        if (isFunction(this.valueRenderer)) {
            ret = this.valueRenderer(value, op);
            if (isValidElement(ret)) {
                // Prevents [object Object] rendering
                ret = renderToStaticMarkup(ret);
            }
        } else if (this.isDateBasedFieldType) {
            ret = fmtDate(value);
        } else {
            ret = value?.toString();
        }
        return stripTags(ret);
    }

    parseValue(value: any, op: FieldFilterOperator) {
        try {
            if (isFunction(this.valueParser)) {
                return this.valueParser(value, op);
            }

            const fieldType = this.fieldType === 'tags' ? 'string' : this.fieldType;
            return parseFieldValue(value, fieldType, undefined);
        } catch (e) {
            return undefined;
        }
    }

    //------------------------
    // Implementation
    //------------------------
    parseExample(example) {
        if (example) return example;
        if (this.isBoolFieldType) return 'true | false';
        if (this.isDateBasedFieldType) return 'YYYY-MM-DD';
        if (this.isNumericFieldType) return this.renderValue(1234, '=');
        return 'value';
    }

    parseValueParser(valueParser) {
        // Default numeric parser
        if (!valueParser && (this.fieldType === 'int' || this.fieldType === 'number')) {
            return input => parseNumber(input);
        }
        return valueParser;
    }

    loadValuesFromSource() {
        const {field, source} = this,
            values = new Set();

        // Note use of unfiltered recordset here to source suggest values. This allows chooser to
        // suggest values from already-filtered fields that will expand the results when selected.
        const sourceStore = source instanceof View ? source.cube.store : source;
        sourceStore.allRecords.forEach(rec => {
            const val = rec.get(field);
            if (!isNil(val)) {
                if (sourceStore.getField(field).type === 'tags') {
                    val.forEach(it => values.add(it));
                } else {
                    values.add(val);
                }
            }
        });

        this.values = Array.from(values);
    }
}

type FilterChooserValueRenderer = (value: any, op: FieldFilterOperator) => ReactNode;

type FilterChooserValueParser = (input: string, op: FieldFilterOperator) => any;
