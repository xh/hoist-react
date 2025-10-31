/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {div, filler, placeholder as placeholderCmp} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, HoistProps, lookup, useLocalModel, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {button} from '@xh/hoist/mobile/cmp/button';
import {checkboxButton} from '@xh/hoist/mobile/cmp/input';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import '@xh/hoist/mobile/register';
import classNames from 'classnames';
import './ColChooser.scss';
import {isEmpty} from 'lodash';
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
            item: div({
                className: 'xh-col-chooser__internal',
                item: dragDropContext({
                    onDragEnd: impl.onDragEnd,
                    items: [
                        panel({
                            className: 'xh-col-chooser__section',
                            scrollable: true,
                            items: [
                                row({col: pinnedColumn, model: impl}),
                                droppable({
                                    droppableId: 'visible-columns',
                                    children: dndProps =>
                                        columnList({
                                            model: impl,
                                            cols: visibleColumns,
                                            className: 'visible-columns',
                                            ref: dndProps.innerRef,
                                            placeholder: dndProps.placeholder
                                        })
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
                            item: droppable({
                                droppableId: 'hidden-columns',
                                isDropDisabled: true,
                                children: dndProps =>
                                    columnList({
                                        model: impl,
                                        cols: hiddenColumns,
                                        className: 'hidden-columns',
                                        ref: dndProps.innerRef,
                                        placeholder: dndProps.placeholder
                                    })
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
    render({cols, placeholder, className, ...props}, ref) {
        return div({
            className: classNames('xh-col-chooser__list', className),
            items: isEmpty(cols)
                ? placeholderCmp('All columns have been added to the grid.')
                : [...cols.map((col, idx) => draggableRow({col, idx})), placeholder],
            ...props,
            ref
        });
    }
});

const draggableRow = hoistCmp.factory({
    render({col, idx}) {
        const {colId, exclude, pinned} = col;
        if (exclude) return null;
        return draggable({
            key: colId,
            draggableId: colId,
            index: idx,
            isDragDisabled: !!pinned,
            children: (dndProps, dndState) =>
                row({
                    key: colId,
                    col,
                    isDragging: dndState.isDragging,
                    ref: dndProps.innerRef,
                    ...dndProps.dragHandleProps,
                    ...dndProps.draggableProps
                })
        });
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
            items: [
                div({
                    className: 'xh-col-chooser__row__grabber',
                    item: getDragIcon(pinned)
                }),
                div({
                    className: 'xh-col-chooser__row__text',
                    item: text
                }),
                button({
                    icon: getButtonIcon(locked, hidden),
                    disabled: locked,
                    minimal: true,
                    onClick: () => model.onHiddenToggleClick(colId, !hidden)
                })
            ],
            ...props,
            ref
        });
    }
});

class ColChooserLocalModel extends HoistModel {
    override xhImpl = true;
    @lookup(ColChooserModel) model: ColChooserModel;

    onDragEnd = result => {
        const {model} = this,
            {pinFirst, columns} = model,
            {draggableId, destination} = result;

        if (!destination) return; // dropped outside of a droppable list

        // Set hidden based on drop destination
        const {droppableId} = destination,
            hide = droppableId === 'hidden-columns';

        // Move to correct idx within list of columns
        let toIdx = destination.index;
        if (pinFirst) toIdx++;
        if (hide) toIdx = columns.length;

        model.setHidden(draggableId, hide);
        model.moveToIndex(draggableId, toIdx);
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
