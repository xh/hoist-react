/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {leftRightChooser, leftRightChooserFilter} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * Hoist UI for user selection and discovery of available Grid columns, enabled via the
 * GridModel.enableColChooser config option.
 *
 * This component displays both available and currently visible columns in two left/right
 * grids, allowing users to toggle columns on and off within its associated grid.
 *
 * It derives its configuration primary from the Grid's Column definitions, supporting features such
 * as custom column display names and descriptions, grouped display of the available column library,
 * and a quick filter for long lists.
 *
 * It is not necessary to manually create instances of this component within an application.
 */
@HoistComponent
export class ColChooser extends Component {

    render() {
        const {isOpen, gridModel, lrModel} = this.model;

        if (!isOpen) return null;

        return dialog({
            icon: Icon.gridPanel(),
            title: 'Choose Columns',
            className: 'xh-grid-column-chooser',
            transitionName: 'none',
            isOpen: true,
            onClose: this.onClose,
            items: [
                leftRightChooser({model: lrModel, height: 300}),
                toolbar(
                    leftRightChooserFilter({model: lrModel, fields: ['text']}),
                    filler(),
                    button({
                        text: 'Reset',
                        icon: Icon.undo({className: 'xh-red'}),
                        omit: !gridModel.stateModel,
                        onClick: this.restoreDefaults
                    }),
                    toolbarSep({
                        omit: !gridModel.stateModel
                    }),
                    button({
                        text: 'Cancel',
                        onClick: this.onClose
                    }),
                    button({
                        text: 'Save',
                        icon: Icon.check({className: 'xh-green'}),
                        onClick: this.onOK
                    })
                )
            ]});
    }

    onClose = () => {this.model.close()};

    onOK = () => {
        this.model.commit();
        this.onClose();
    }

    restoreDefaults = () => {
        const {model} = this,
            {stateModel} = model.gridModel;

        stateModel.resetStateAsync().then(() => {
            model.syncChooserData();
        });
    }

}
export const colChooser = elemFactory(ColChooser);