/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {vframe, div} from '@xh/hoist/cmp/layout';
import {dialogPage} from '@xh/hoist/mobile/cmp/page';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {button} from '@xh/hoist/mobile/cmp/button';
import {filler} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';

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
 * It derives its configuration primary from the Grid's Column definitions.
 *
 * It is not necessary to manually create instances of this component within an application.
 *
 * Todo: Implement DnD reordering, see example here: https://codesandbox.io/s/k260nyxq9v
 */
@HoistComponent
export class ColChooser extends Component {

    static modelClass = ColChooserModel;

    render() {
        const {isOpen, gridModel} = this.model;

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

                this.renderColumnList(),

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
    renderColumnList() {
        const {data} = this.model;

        return vframe({
            className: 'xh-col-chooser',
            items: data.map(it => this.renderColumnRow(it))
        });
    }

    renderColumnRow({colId, text, hidden, locked, exclude}) {
        if (exclude) return;

        const getRowIcon = (locked, hidden) => {
            if (locked) return Icon.lock();
            if (hidden) return Icon.cross();
            return Icon.check({className: 'xh-green'});
        };

        return div({
            className: 'xh-col-chooser-row',
            items: [
                div({
                    className: 'xh-col-chooser-row-grabber',
                    item: Icon.arrowsUpDown()
                }),
                div({
                    className: 'xh-col-chooser-row-text',
                    item: text
                }),
                button({
                    icon: getRowIcon(locked, hidden),
                    disabled: locked,
                    modifier: 'quiet',
                    onClick: () => {
                        this.model.setHidden(colId, !hidden);
                    }
                })
            ]
        });
    }

}

export const colChooser = elemFactory(ColChooser);