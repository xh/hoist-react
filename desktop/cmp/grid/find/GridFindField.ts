/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {hbox} from '@xh/hoist/cmp/layout';
import type {LayoutProps} from '@xh/hoist/core';
import {hoistCmp, useLocalModel} from '@xh/hoist/core';
import type {FilterMatchMode, FilterMatchOn} from '@xh/hoist/data';
import type {TextInputProps} from '@xh/hoist/desktop/cmp/input';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {consumeEvent} from '@xh/hoist/utils/js';
import {useComposedRefs, splitLayoutProps} from '@xh/hoist/utils/react';
import './GridFindField.scss';
import type {BaseGridFindImplModel} from './impl/BaseGridFindImplModel';
import {findFieldControls} from './impl/FindFieldControls';
import {GridCellFindImplModel} from './impl/GridCellFindImplModel';
import {GridFindFieldImplModel} from './impl/GridFindFieldImplModel';

/**
 * What a {@link GridFindField} finds and moves between:
 * - `rows` - matching records, which it selects.
 * - `cells` - matching cells, as Excel's Find does, selecting the row of each match. Column headers
 *   are also searched if `includeHeaders` is set.
 */
export type GridFindFieldMode = 'rows' | 'cells';

export interface GridFindFieldProps extends TextInputProps, LayoutProps {
    /**
     * True to focus this field on Ctrl+F (Cmd+F on Mac), in place of the browser's own find. A
     * focused component or app handler that handles the key first keeps it. With several such
     * fields on screen, Ctrl+F goes to the one whose grid has focus, else the next one after the
     * focused element in focus order. A field that is covered, as by a dialog, or off screen is
     * skipped. If no field can take focus, the browser handles the key. Default false.
     */
    enableHotkey?: boolean;

    /**
     * Model whose data this control should search. When given a GridModel or CubeGridModel, this
     * component will, by default, use the fields for all *visible* columns when
     * matching, as well as any groupBy field. When given a ZoneGridModel, it
     * uses the fields currently mapped to any of its zones. Mode `cells` supports GridModel and
     * CubeGridModel only.
     */
    gridModel?: GridLikeModel;

    /**
     * True to also find matching column headers in mode `cells`, ahead of the cell matches, as
     * Excel treats headers as its first row. Default false.
     */
    includeHeaders?: boolean;

    /** Mode to use when searching - default 'startWord' in mode `rows`, 'any' in mode `cells`. */
    matchMode?: FilterMatchMode;

    /**
     * What to match - each field's raw value, the text its column shows, or either. Default
     * 'value'. See {@link FilterMatchOn}, including the cost of 'rendered' on large grids.
     */
    matchOn?: FilterMatchOn;

    /**
     * What this field finds - matching rows, which it selects, or matching cells, which it moves
     * between. Read once, when the field mounts. Default 'rows'.
     */
    mode?: GridFindFieldMode;

    /**
     * Delay (in ms) to buffer searching the grid after the value changes from user input.
     * Default 200ms. Set to 0 to filter immediately on each keystroke.
     */
    queryBuffer?: number;

    /**
     * Names of field(s) to include in search. Cannot be used with `excludeFields`. In mode `cells`,
     * limits the search to the headers and cells of columns for these fields.
     */
    includeFields?: string[];

    /**
     * Names of field(s) to exclude from search. Cannot be used with `includeFields`. In mode
     * `cells`, skips the headers and cells of columns for these fields.
     */
    excludeFields?: string[];
}

/**
 * A text input Component that enables users to search through a Grid and select rows that match
 * the entered search term based on simple word-boundary matching of its value to the value of
 * configured fields on a record. If any field values match, the record itself is considered a match.
 *
 * This component is designed to be bound to a GridModel, ZoneGridModel or CubeGridModel via its
 * `gridModel` prop. If not configured, it binds by default to the nearest such model found in
 * context. Binding in this way allows the component to
 * auto-generate the fields in the store to be searched by the field and to automatically select
 * the results in the Grid.
 *
 * Fields to be searched can be automatically determined from the bound Grid's Store, and/or
 * customized via the include/excludeFields props. See prop comments for details.
 *
 * Set `mode: 'cells'` to find matching cells instead, and move between them as Excel's Find does.
 * Cells match on the same fields and `matchOn` setting as mode `rows`.
 * Hidden columns are skipped, but columns within a collapsed column group are searched, and a step
 * to one expands its group. Cells match across all rows, including those scrolled out of view or
 * within collapsed row groups, and are visited row by row, left to right. With `includeHeaders`,
 * column headers are searched too, and their matches come first. A column matches on its own
 * header or that of any group above it. Each step starts from the cell the user last focused in
 * the grid, or from the selected row. The active match is outlined, and if the grid has selection
 * enabled, the row of a matching cell is selected. Esc clears the search and focuses the matched
 * cell, or for a header, that column's cell in the focused row.
 *
 * This component supports all props available to TextInput and will pass them along to its
 * underlying TextInput.
 */
export const [GridFindField, gridFindField] = hoistCmp.withFactory<GridFindFieldProps>({
    displayName: 'GridFindField',
    className: 'xh-grid-find-field',
    model: false,
    render({className, model, mode, enableHotkey, includeHeaders, ...props}, ref) {
        let [layoutProps, restProps] = splitLayoutProps(props);
        const impl = useLocalModel<BaseGridFindImplModel>(
            mode === 'cells' ? GridCellFindImplModel : GridFindFieldImplModel
        );

        return hbox({
            width: 240,
            className,
            ...layoutProps,
            children: [
                textInput({
                    model: impl,
                    bind: 'query',
                    ref: useComposedRefs(impl.inputRef, ref),
                    commitOnChange: true,
                    leftIcon: Icon.search(),
                    enableClear: true,
                    placeholder: 'Find',
                    selectOnFocus: true,
                    width: null,
                    flex: 1,
                    onKeyDown: e => {
                        switch (e.key) {
                            case 'Enter':
                                e.shiftKey ? impl.selectPrev() : impl.selectNext();
                                consumeEvent(e);
                                break;
                            case 'ArrowUp':
                                if (e.shiftKey) return;
                                impl.selectPrev();
                                consumeEvent(e);
                                break;
                            case 'ArrowDown':
                                if (e.shiftKey) return;
                                impl.selectNext();
                                consumeEvent(e);
                                break;
                            case 'Escape':
                                // Leave Esc to a parent, such as a dialog, once there is nothing to clear.
                                if (!(impl instanceof GridCellFindImplModel) || !impl.hasQuery) {
                                    return;
                                }
                                impl.endFind();
                                consumeEvent(e);
                                break;
                        }
                    },
                    ...restProps
                }),
                findFieldControls({impl})
            ]
        });
    }
});
