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
import type {TextInputProps} from '@xh/hoist/desktop/cmp/input';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {consumeEvent} from '@xh/hoist/utils/js';
import {splitLayoutProps, useComposedRefs} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import './GridFindField.scss';
import {findFieldControls} from './impl/FindFieldControls';
import {GridCellFindFieldImplModel} from './impl/GridCellFindFieldImplModel';

export interface GridCellFindFieldProps extends TextInputProps, LayoutProps {
    /**
     * True to focus this field on Ctrl+F (Cmd+F on Mac), in place of the browser's own find. With
     * several such fields on screen, Ctrl+F goes to the one whose grid has focus, else the one last
     * used, else the browser handles it. Default false.
     */
    enableHotkey?: boolean;

    /**
     * Model whose headers and cells this control should search. If not provided, the nearest
     * GridModel, ZoneGridModel or CubeGridModel found in context is used.
     */
    gridModel?: GridLikeModel;

    /**
     * Delay (in ms) to buffer searching the grid after the value changes from user input.
     * Default 200ms. Set to 0 to search immediately on each keystroke.
     */
    queryBuffer?: number;
}

/**
 * A text input that finds text in the column headers and cells of a Grid and moves between the
 * matches, in the manner of Excel's Find.
 *
 * Matches are found anywhere within the text a header or cell displays, ignoring case. A column
 * matches on its own header or that of any group above it - hidden columns are skipped. Cells match
 * across all rows, including those scrolled out of view or within collapsed groups. As headers are
 * the first row in Excel, header matches come first, then cell matches row by row, left to right.
 *
 * Enter (or the down button) moves to the next match and Shift+Enter (or the up button) to the
 * previous one, wrapping at either end. Each step starts from the cell the user last focused in
 * the grid, or from the selected row. Landing on a header scrolls its column into view. Esc clears
 * the search and focuses the matched cell, or for a header, that column's cell in the focused row.
 * Moving between matches does not change the grid's row selection. Set `enableHotkey` to have
 * Ctrl+F focus this field.
 *
 * Requires ag-Grid's Enterprise `FindModule` to be registered by the app - without it, this
 * component logs an error and is disabled. See {@link GridFindField} to find and select matching
 * rows instead, without that dependency.
 */
export const [GridCellFindField, gridCellFindField] = hoistCmp.withFactory<GridCellFindFieldProps>({
    displayName: 'GridCellFindField',
    className: 'xh-grid-cell-find-field',
    render({className, model, enableHotkey, ...props}, ref) {
        const [layoutProps, restProps] = splitLayoutProps(props),
            impl = useLocalModel(GridCellFindFieldImplModel);

        return hbox({
            width: 240,
            className: classNames(className, 'xh-grid-find-field'),
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
                    disabled: !impl.isAvailable,
                    width: null,
                    flex: 1,
                    onKeyDown: e => {
                        switch (e.key) {
                            case 'Enter':
                                e.shiftKey ? impl.selectPrev() : impl.selectNext();
                                consumeEvent(e);
                                break;
                            case 'Escape':
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
