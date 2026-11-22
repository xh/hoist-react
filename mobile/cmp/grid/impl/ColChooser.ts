/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, filler, placeholder as placeholderCmp} from '@xh/hoist/cmp/layout';
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp, HoistModel, lookup, useLocalModel, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {
    DND_PLUGINS,
    DND_SENSORS,
    DND_TRANSITION
} from '@xh/hoist/cmp/sortablelist/impl/DndDefaults';
import type {DragEndEvent} from '@xh/hoist/kit/dnd-kit';
import {dragDropProvider, isSortable, useSortable} from '@xh/hoist/kit/dnd-kit';
import {button} from '@xh/hoist/mobile/cmp/button';
import {checkboxButton} from '@xh/hoist/mobile/cmp/input';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import '@xh/hoist/mobile/register';
import classNames from 'classnames';
import './ColChooser.scss';
import {isEmpty, isString} from 'lodash';
import {ColChooserModel} from './ColChooserModel';

export interface ColChooserProps extends HoistProps<ColChooserModel> {}

/**
 * Hoist UI for user selection and discovery of available Grid columns, enabled via the
 * GridModel.colChooserModel config option.
 *
 * This component displays available columns in a list, with currently visible columns
 * identified by a checkmark icon to the right of the column name. Users can toggle column
 * visibility within its associated grid by tapping this icon.
 *
 * User can drag and drop the columns in the list to reorder them in the grid.
 *
 * It derives its configuration primary from the Grid's Column definitions.
 *
 * It is not necessary to manually create instances of this component within an application.
 */
export const [ColChooser, colChooser] = hoistCmp.withFactory<ColChooserProps>({
    displayName: 'ColChooser',
    model: uses(ColChooserModel),
    className: 'xh-col-chooser',

    render({model, className}) {
        const {
                isOpen,
                gridModel,
                pinnedColumn,
                visibleColumns,
                hiddenColumns,
                showRestoreDefaults
            } = model,
            impl = useLocalModel(ColChooserLocalModel);

        return dialogPanel({
            isOpen,
            title: 'Choose Columns',
            icon: Icon.gridPanel(),
            className,
            children: div({
                className: 'xh-col-chooser__internal',
                children: dragDropProvider({
                    sensors: DND_SENSORS,
                    plugins: DND_PLUGINS,
                    onDragEnd: impl.onDragEnd,
                    children: [
                        panel({
                            className: 'xh-col-chooser__section',
                            scrollable: true,
                            children: [
                                row({col: pinnedColumn, model: impl}),
                                columnList({
                                    model: impl,
                                    cols: visibleColumns,
                                    group: 'visible',
                                    className: 'visible-columns'
                                })
                            ]
                        }),
                        checkboxButton({
                            model,
                            bind: 'pinFirst',
                            omit: !gridModel.enableColumnPinning,
                            text: 'Pin first column so it is always visible'
                        }),
                        panel({
                            title: 'Available Columns',
                            className: 'xh-col-chooser__section',
                            scrollable: true,
                            children: columnList({
                                model: impl,
                                cols: hiddenColumns,
                                group: 'hidden',
                                className: 'hidden-columns'
                            })
                        })
                    ]
                })
            }),
            bbar: [
                button({
                    text: 'Reset',
                    icon: Icon.reset(),
                    minimal: true,
                    omit: !showRestoreDefaults,
                    onClick: () => model.restoreDefaultsAsync()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    onClick: () => model.close()
                }),
                button({
                    text: 'Apply',
                    icon: Icon.check(),
                    intent: 'primary',
                    outlined: true,
                    onClick: () => {
                        model.commit();
                        model.close();
                    }
                })
            ]
        });
    }
});

//------------------------
// Implementation
//------------------------
const columnList = hoistCmp.factory({
    model: false,
    render({cols, group, className}) {
        return div({
            className: classNames('xh-col-chooser__list', className),
            children: isEmpty(cols)
                ? placeholderCmp('All columns have been added to the grid.')
                : cols.map((col, idx) =>
                      col.exclude
                          ? null
                          : sortableRow({key: col.colId, col, idx, group, count: cols.length})
                  )
        });
    }
});

// Visible columns reorder among themselves. Hidden columns can be dragged into the visible list,
// but nothing drops into the hidden list.
const sortableRow = hoistCmp.factory({
    model: false,
    render({col, idx, group, count}) {
        const {colId, pinned, text} = col,
            hiddenGroup = group === 'hidden',
            sortable = useSortable({
                id: colId,
                index: idx,
                group,
                type: 'column',
                accept: 'column',
                data: {label: isString(text) ? text : colId, count},
                disabled: hiddenGroup ? {droppable: true} : {draggable: !!pinned},
                transition: DND_TRANSITION
            });

        return row({col, isDragging: sortable.isDragging, ref: sortable.ref});
    }
});

const row = hoistCmp.factory<ColChooserLocalModel>({
    render({model, col, isDragging, ...props}, ref) {
        if (!col) return null;

        let {colId, text, pinned, hidden, locked, exclude} = col;
        if (exclude) return null;

        const getDragIcon = pinned => {
            return pinned ? Icon.pin({prefix: 'fas'}) : Icon.grip({prefix: 'fas'});
        };

        const getButtonIcon = (locked, hidden) => {
            if (locked) return Icon.lock();
            if (hidden) return Icon.add({className: 'xh-green'});
            return Icon.cross();
        };

        return div({
            className: classNames(
                'xh-col-chooser__row',
                pinned ? 'xh-col-chooser__row--pinned' : null,
                isDragging ? 'xh-col-chooser__row--dragging' : null
            ),
            ...props,
            children: [
                div({
                    className: 'xh-col-chooser__row__grabber',
                    children: getDragIcon(pinned)
                }),
                div({
                    className: 'xh-col-chooser__row__text',
                    children: text
                }),
                button({
                    icon: getButtonIcon(locked, hidden),
                    disabled: locked,
                    minimal: true,
                    onClick: () => model.onHiddenToggleClick(colId, !hidden)
                })
            ],
            ref
        });
    }
});

class ColChooserLocalModel extends HoistModel {
    override xhImpl = true;
    @lookup(ColChooserModel) model: ColChooserModel;

    onDragEnd = (e: DragEndEvent) => {
        const {source} = e.operation;
        if (e.canceled || !isSortable(source) || source.group !== 'visible') return;
        if (source.initialGroup === 'visible' && source.initialIndex === source.index) return;

        const {model} = this,
            colId = source.id as string,
            toIdx = model.pinFirst ? source.index + 1 : source.index;

        model.setHidden(colId, false);
        model.moveToIndex(colId, toIdx);
    };

    onHiddenToggleClick = (colId, hide) => {
        const {model} = this,
            {pinFirst, visibleColumns, hiddenColumns} = model;

        // When moving between lists, set idx to appear at the end of the destination sublist
        let toIdx = visibleColumns.length;
        if (pinFirst) toIdx++;
        if (hide) toIdx += hiddenColumns.length;

        model.moveToIndex(colId, toIdx);
        model.setHidden(colId, hide);
    };
}
