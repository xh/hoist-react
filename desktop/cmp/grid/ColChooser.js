/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog} from '@xh/hoist/desktop/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/layout';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {leftRightChooser, leftRightChooserFilter} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

@HoistComponent()
export class ColChooser extends Component {

    render() {
        const {isOpen, gridModel, lrModel} = this.model;

        if (!isOpen) return null;

        return dialog({
            icon: Icon.grid(),
            title: 'Choose Columns',
            cls: 'xh-grid-column-chooser',
            isOpen: true,
            onClose: this.onClose,
            items: [
                leftRightChooser({model: lrModel, height: 300}),
                toolbar(
                    leftRightChooserFilter({model: lrModel, fields: ['text']}),
                    filler(),
                    button({
                        text: 'Reset',
                        icon: Icon.undo({cls: 'xh-red'}),
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
                        icon: Icon.check({cls: 'xh-green'}),
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