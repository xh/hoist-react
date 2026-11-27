/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnOrGroup, GridModel} from '@xh/hoist/cmp/grid';
import {Column} from '@xh/hoist/cmp/grid';
import type {FilterMatchOn, Store, StoreRecord} from '@xh/hoist/data';
import {stripTags} from '@xh/hoist/utils/js';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';
import {get, isEmpty, isFunction, isNil, toString, unescape} from 'lodash';
import {isValidElement} from 'react';

/** Reads text from a record for a find or filter field to match. @internal */
export type MatchTextGetter = (record: StoreRecord) => string;

/**
 * Functions that read the text to match for one field of a record, per `matchOn`. A record matches
 * on the field if any of them gives matching text. Shared by `StoreFilterField` and both modes of
 * `GridFindField`, so all match the same way.
 *
 * @param columns - the grid's searched columns for the field, or null if not bound to a grid.
 *      Without a grid, the raw value is matched in every mode. A field with no searched column,
 *      such as one named only in `includeFields`, matches its raw value too, as it has no text
 *      shown - except a date, which cannot match without it.
 * @internal
 */
export function getMatchTextGetters(
    fieldName: string,
    store: Store,
    columns: Column[],
    matchOn: FilterMatchOn,
    cache: CellTextCache
): MatchTextGetter[] {
    // Use expensive get() only when needed to support dot-separated paths.
    const raw: MatchTextGetter = fieldName.includes('.')
        ? rec => toString(get(rec.data, fieldName))
        : rec => toString(rec.data[fieldName]);
    if (!columns) return [raw];

    const rendered = columns.map(
            (col): MatchTextGetter =>
                rec =>
                    cache.getText(col, rec)
        ),
        type = store.getField(fieldName)?.type;

    // A raw date does not read as a date, so dates match on the text shown in every mode.
    if (type === 'date' || type === 'localDate') return rendered;
    if (matchOn === 'value' || isEmpty(rendered)) return [raw];
    return matchOn === 'rendered' ? rendered : [raw, ...rendered];
}

/**
 * Text shown by cells, so each is rendered once. Text is kept per distinct raw value of each
 * column, as autosize does, or per record for a column whose renderer is complex - an updated
 * record is a new instance, with no text kept. A renderer that reads state outside the record can
 * leave text stale until its value or record changes.
 * @internal
 */
export class CellTextCache {
    private byValue = new WeakMap<Column, Map<unknown, string>>();
    private byRecord = new WeakMap<StoreRecord, Map<Column, string>>();

    getText(column: Column, record: StoreRecord): string {
        if (!column.resolvedRenderer) return getCellText(column, record);

        if (column.rendererIsComplex) {
            const texts = getOrCreate(this.byRecord, record, () => new Map<Column, string>());
            return getOrCreate(texts, column, () => getCellText(column, record));
        }

        const texts = getOrCreate(this.byValue, column, () => new Map<unknown, string>()),
            value = getCellValue(column, record);
        return getOrCreate(texts, value, () => renderCellText(column, value, record));
    }
}

/**
 * True if a column's header, or that of any group above it, matches the regex.
 *
 * @param colId - the column to test.
 * @param groupIds - ids of the column groups above it, innermost first.
 * @param regex - the query, as built by `getFilterRegex()`.
 * @internal
 */
export function isHeaderMatch(
    gridModel: GridModel,
    colId: string,
    groupIds: string[],
    regex: RegExp
): boolean {
    const column = gridModel.getColumn(colId);
    if (!column) return false;

    const matches = (it: ColumnOrGroup) => !!it && regex.test(getHeaderText(it, gridModel));
    return matches(column) || groupIds.some(id => matches(gridModel.getColumnGroup(id)));
}

/**
 * The header text shown for a column or group. Markup from an element or a function's result is
 * rendered and stripped to its text.
 * @internal
 */
export function getHeaderText(colOrGroup: ColumnOrGroup, gridModel: GridModel): string {
    const {headerName} = colOrGroup,
        value = isFunction(headerName)
            ? headerName(
                  colOrGroup instanceof Column
                      ? {column: colOrGroup, gridModel, agParams: null}
                      : {columnGroup: colOrGroup, gridModel, agParams: null}
              )
            : headerName;
    return toText(value, false);
}

/**
 * The text a cell shows for a record - its value, passed through the column's renderer or text
 * renderer. A renderer's markup is rendered and stripped to its text, as autosize does, while a
 * text renderer's output and a raw value are used as they are. Empty if the value cannot be read.
 * @internal
 */
export function getCellText(column: Column, record: StoreRecord): string {
    return renderCellText(column, getCellValue(column, record), record);
}

//------------------------
// Implementation
//------------------------
const NO_VALUE = Symbol('noValue');

function getCellValue(column: Column, record: StoreRecord): unknown {
    const {gridModel, field} = column;
    try {
        return column.getValueFn({record, field, store: record.store, column, gridModel});
    } catch {
        return NO_VALUE;
    }
}

function renderCellText(column: Column, value: unknown, record: StoreRecord): string {
    if (value === NO_VALUE) return '';
    const {gridModel, renderer, resolvedRenderer} = column;
    try {
        return toText(
            resolvedRenderer ? resolvedRenderer(value, {record, column, gridModel}) : value,
            !!renderer
        );
    } catch {
        return '';
    }
}

// Plain text for a header or cell value. A React element is always rendered and stripped of its
// tags, and a string only when it holds a renderer's markup.
function toText(value: unknown, isMarkup: boolean): string {
    if (isNil(value)) return '';
    if (isValidElement(value)) {
        value = renderToStaticMarkup(value);
        isMarkup = true;
    }
    const ret = toString(value);
    return isMarkup ? unescape(stripTags(ret)) : ret;
}

function getOrCreate<K, V>(map: Map<K, V> | WeakMap<any, V>, key: K, create: () => V): V {
    let ret = map.get(key);
    if (ret === undefined) {
        ret = create();
        map.set(key, ret);
    }
    return ret;
}
