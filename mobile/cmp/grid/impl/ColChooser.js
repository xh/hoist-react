/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {label, switchInput} from '@xh/hoist/mobile/cmp/input';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';

import {dragDropContext, droppable, draggable} from '@xh/hoist/kit/react-beautiful-dnd';

import './ColChooser.scss';
import {ColChooserModel} from './ColChooserModel';

/**
 * Hoist UI for user selection and discovery of available Grid columns, enabled via the
 * GridModel.enableColChooser config option.
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
@HoistComponent
export class ColChooser extends Component {

    static modelClass = ColChooserModel;

    render() {
        const {model} = this,
            {isOpen, gridModel, enablePinFirstRow, visibleColumns, hiddenColumns} = model;

        return dialogPanel({
            isOpen,
            title: 'Choose Columns',
            icon: Icon.gridPanel(),
            className: 'xh-col-chooser',
            items: [
                dragDropContext({
                    onDragEnd: this.onDragEnd,
                    items: [
                        panel({
                            className: 'xh-col-chooser-section',
                            scrollable: true,
                            items: [
                                droppable({
                                    droppableId: 'visible-columns',
                                    item: (dndProps) => {
                                        return this.renderColumnList(visibleColumns, {
                                            className: 'visible-columns',
                                            ref: dndProps.innerRef,
                                            placeholder: dndProps.placeholder
                                        });
                                    }
                                })
                            ],
                            bbar: toolbar({
                                omit: !enablePinFirstRow,
                                items: [
                                    label('Pin first column'),
                                    filler(),
                                    switchInput({
                                        model: model,
                                        bind: 'pinFirst'
                                    })
                                ]
                            })
                        }),

                        panel({
                            title: 'Available Columns',
                            className: 'xh-col-chooser-section',
                            scrollable: true,
                            item: droppable({
                                droppableId: 'hidden-columns',
                                item: (dndProps) => {
                                    return this.renderColumnList(hiddenColumns, {
                                        className: 'hidden-columns',
                                        ref: dndProps.innerRef,
                                        placeholder: dndProps.placeholder
                                    });
                                }
                            })
                        })
                    ]
                })
            ],
            bbar: [
                button({
                    text: 'Reset',
                    modifier: 'quiet',
                    omit: !gridModel.stateModel,
                    onClick: () => model.restoreDefaults()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    modifier: 'quiet',
                    onClick: () => model.close()
                }),
                button({
                    text: 'Save',
                    icon: Icon.check(),
                    onClick: this.onOK
                })
            ]
        });
    }

    onOK = () => {
        this.model.commit();
        this.model.close();
    };

    onDragEnd = (result) => {
        const {columns} = this.model,
            {draggableId, destination} = result;

        if (!destination) return; // dropped outside of a droppable list

        // Set hidden based on drop destination
        const {droppableId} = destination,
            hide = droppableId === 'hidden-columns';

        // Move to correct idx within list of columns
        let toIdx = destination.index;
        if (hide) toIdx = columns.length;

        this.model.setHidden(draggableId, hide);
        this.model.moveToIndex(draggableId, toIdx);
        this.model.updatePinnedColumn();
    };

    //------------------------
    // Implementation
    //------------------------
    renderColumnList(columns, props = {}) {
        const {placeholder, className, ...rest} = props;

        return div({
            className: classNames('xh-col-chooser-list', className),
            items: [
                ...columns.map((col, idx) => {
                    return this.renderDraggableRow(col, idx);
                }),
                placeholder
            ],
            ...rest
        });
    }

    renderDraggableRow(col, idx) {
        const {colId, exclude, pinned} = col;

        if (exclude) return;

        return draggable({
            key: colId,
            draggableId: colId,
            index: idx,
            isDragDisabled: !!pinned,
            item: (dndProps, dndState) => {
                return this.renderRow(col, {
                    isDragging: dndState.isDragging,
                    ref: dndProps.innerRef,
                    ...dndProps.dragHandleProps,
                    ...dndProps.draggableProps
                });
            }
        });
    }

    renderRow(col, props = {}) {
        const {colId, text, pinned, hidden, locked, exclude} = col,
            {isDragging, ...rest} = props;

        if (exclude) return;

        const getButtonIcon = (locked, hidden) => {
            if (locked) return Icon.lock();
            if (hidden) return Icon.add({className: 'xh-green'});
            return Icon.cross();
        };

        return div({
            className: classNames(
                'xh-col-chooser-row',
                pinned ? 'xh-col-chooser-row-pinned' : null,
                isDragging ? 'xh-col-chooser-row-dragging' : null
            ),
            items: [
                div({
                    className: 'xh-col-chooser-row-grabber',
                    item: pinned ? Icon.pin({prefix: 'fas'}) : Icon.grip({prefix: 'fas'})
                }),
                div({
                    className: 'xh-col-chooser-row-text',
                    item: text
                }),
                button({
                    icon: getButtonIcon(locked, hidden),
                    disabled: locked,
                    modifier: 'quiet',
                    onClick: () => this.model.onHideBtnClick(colId, !hidden)
                })
            ],
            ...rest
        });
    }
}

export const colChooser = elemFactory(ColChooser);