/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
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
            {isOpen, gridModel, pinnedColumns, visibleColumns, hiddenColumns} = model;

        return dialogPanel({
            isOpen,
            title: 'Choose Columns',
            headerItems: [
                button({
                    icon: Icon.undo({size: 'sm'}),
                    style: {maxHeight: 16},
                    modifier: 'quiet',
                    omit: !gridModel.stateModel,
                    onClick: () => model.restoreDefaults()
                })
            ],
            icon: Icon.gridPanel(),
            className: 'xh-col-chooser',
            items: [
                dragDropContext({
                    onDragEnd: this.onDragEnd,
                    items: [
                        panel({
                            icon: Icon.eye(),
                            title: 'Displayed Columns',
                            className: 'xh-col-chooser-section',
                            scrollable: true,
                            items: [
                                // 1) Render pinned columns in a static list
                                this.renderColumnList(pinnedColumns, {
                                    className: 'pinned-columns'
                                }),

                                // 2) Render visible columns in draggable list
                                droppable({
                                    droppableId: 'visible-columns',
                                    item: (dndProps) => {
                                        return this.renderColumnList(visibleColumns, {
                                            className: 'visible-columns',
                                            isDraggable: true,
                                            ref: dndProps.innerRef,
                                            placeholder: dndProps.placeholder
                                        });
                                    }
                                })
                            ]
                        }),

                        // 3) Render hidden columns in draggable list
                        panel({
                            icon: Icon.eyeSlash(),
                            title: 'Available Columns',
                            className: 'xh-col-chooser-section',
                            scrollable: true,
                            item: droppable({
                                droppableId: 'hidden-columns',
                                item: (dndProps) => {
                                    return this.renderColumnList(hiddenColumns, {
                                        className: 'hidden-columns',
                                        isDraggable: true,
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
                    icon: Icon.x(),
                    flex: 1,
                    onClick: () => model.close()
                }),
                button({
                    icon: Icon.check(),
                    flex: 1,
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
        const {pinnedColumns, visibleColumns} = this.model,
            {draggableId, destination} = result;

        if (!destination) return; // dropped outside of a droppable list

        // Set hidden based on drop destination
        const {droppableId} = destination,
            hide = droppableId === 'hidden-columns';
        this.model.setHidden(draggableId, hide);

        // Set sort idx base on destination list idx.
        // Overall list idx must account for previous sublist lengths.
        let toIdx = destination.index;
        if (destination.droppableId === 'visible-columns') toIdx += pinnedColumns.length;
        if (destination.droppableId === 'hidden-columns') toIdx += pinnedColumns.length + visibleColumns.length;
        this.model.moveToIndex(draggableId, toIdx);
    };

    //------------------------
    // Implementation
    //------------------------
    renderColumnList(columns, props = {}) {
        const {isDraggable, placeholder, className = '', ...rest} = props;

        return div({
            className: `xh-col-chooser-list ${className}`,
            items: [
                ...columns.map((col, idx) => {
                    return isDraggable ? this.renderDraggableRow(col, idx) : this.renderRow(col);
                }),
                placeholder
            ],
            ...rest
        });
    }

    renderDraggableRow(col, idx) {
        const {colId, exclude} = col;

        if (exclude) return;

        return draggable({
            key: colId,
            draggableId: colId,
            index: idx,
            item: (dndProps, dndState) => {
                return this.renderRow(col, {
                    isDraggable: true,
                    isDragging: dndState.isDragging,
                    ref: dndProps.innerRef,
                    ...dndProps.dragHandleProps,
                    ...dndProps.draggableProps
                });
            }
        });
    }

    renderRow(col, props = {}) {
        const {colId, text, hidden, locked, exclude} = col,
            {isDraggable, isDragging, ...rest} = props;

        if (exclude) return;

        const getButtonIcon = (locked, hidden) => {
            if (locked) return Icon.lock();
            if (hidden) return Icon.cross();
            return Icon.check({className: 'xh-green'});
        };

        return div({
            className: classNames(
                'xh-col-chooser-row',
                isDragging ? 'xh-col-chooser-row-dragging' : null
            ),
            items: [
                div({
                    className: 'xh-col-chooser-row-grabber',
                    item: isDraggable ? Icon.arrowsUpDown() : Icon.lock()
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