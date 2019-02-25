/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {dialogPage} from '@xh/hoist/mobile/cmp/page';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {button} from '@xh/hoist/mobile/cmp/button';
import {filler} from '@xh/hoist/cmp/layout';
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
        const {isOpen, data, gridModel} = this.model;

        return dialogPage({
            isOpen,
            items: [
                // Todo: Remove this once https://github.com/exhi/hoist-react/pull/979 merged
                div({
                    className: 'xh-col-chooser-title',
                    items: [
                        Icon.gridPanel(),
                        'Choose Columns'
                    ]
                }),

                dragDropContext({
                    onDragEnd: this.onDragEnd.bind(this),
                    item: droppable({
                        droppableId: 'column-list',
                        item: (dndProps) => this.renderColumnList(dndProps, data)
                    })
                }),

                // Todo: toolbar > panel.bbar once https://github.com/exhi/hoist-react/pull/979 merged
                toolbar(
                    button({
                        text: 'Reset',
                        icon: Icon.undo(),
                        modifier: 'quiet',
                        omit: !gridModel.stateModel,
                        onClick: this.restoreDefaults
                    }),
                    filler(),
                    button({
                        text: 'Cancel',
                        modifier: 'quiet',
                        onClick: this.onClose
                    }),
                    button({
                        text: 'Save',
                        icon: Icon.check(),
                        onClick: this.onOK
                    })
                )
            ]
        });
    }

    onClose = () => {
        this.model.close();
    };

    onOK = () => {
        this.model.commit();
        this.onClose();
    };

    restoreDefaults = () => {
        const {model} = this,
            {stateModel} = model.gridModel;

        stateModel.resetStateAsync().then(() => {
            model.syncChooserData();
        });
    };

    //------------------------
    // Implementation
    //------------------------
    renderColumnList(dndProps, data) {
        const rows = data.map((col, idx) => {
            return this.renderColumnRow(col, idx);
        });

        return div({
            ref: dndProps.innerRef,
            className: 'xh-col-chooser',
            items: [
                ...rows,
                dndProps.placeholder
            ]
        });
    }

    renderColumnRow(col, idx) {
        const {colId, text, pinned, hidden, locked, exclude} = col;
        if (exclude) return;

        const getHandleIcon = (pinned) => {
            if (pinned) return Icon.lock();
            return Icon.arrowsUpDown();
        };

        const getButtonIcon = (locked, hidden) => {
            if (locked) return Icon.lock();
            if (hidden) return Icon.cross();
            return Icon.check({className: 'xh-green'});
        };

        return draggable({
            key: colId,
            draggableId: colId,
            index: idx,
            isDragDisabled: locked,
            item: (dndProps, dndState) => {
                const {isDragging} = dndState;

                return div({
                    ref: dndProps.innerRef,
                    className: classNames(
                        'xh-col-chooser-row',
                        isDragging ? 'xh-col-chooser-row-dragging' : null
                    ),
                    items: [
                        div({
                            className: 'xh-col-chooser-row-grabber',
                            item: getHandleIcon(pinned),
                            ...dndProps.dragHandleProps
                        }),
                        div({
                            className: 'xh-col-chooser-row-text',
                            item: text
                        }),
                        button({
                            icon: getButtonIcon(locked, hidden),
                            disabled: locked,
                            modifier: 'quiet',
                            onClick: () => this.model.setHidden(colId, !hidden)
                        })
                    ],
                    ...dndProps.draggableProps
                });
            }
        });
    }

    onDragEnd(result) {
        const {draggableId, destination} = result;
        if (!result.destination) return; // dropped outside the list
        this.model.moveToIndex(draggableId, destination.index);
    }

}

export const colChooser = elemFactory(ColChooser);