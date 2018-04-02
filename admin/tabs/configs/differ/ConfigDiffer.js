/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog, dialogBody} from 'hoist/kit/blueprint';
import {frame} from 'hoist/layout'
import {grid} from 'hoist/grid';
import {label, textField, toolbar} from 'hoist/cmp';

import {ConfigDifferModel} from './ConfigDifferModel';

@hoistComponent()
export class ConfigDiffer extends Component {

    render() {
        return dialog({
            title: 'Config Differ',
            isOpen: this.model.isOpen,
            isCloseButtonShown: true,
            onClose: this.onCloseClick,
            style: {height: 600},
            items: this.getDialogItems()
        });
    }

    //------------------------
    // Implementation
    //------------------------
    getDialogItems() {
        return [
            dialogBody({
                style: {height: 600}, // nope
                items: [
                    frame(grid({model: this.model.gridModel})) // not filling the space before or after load
                ]
            }),
            // dialogBody('Im the dialog body'),
            toolbar({
                items: [
                    label('Compare with:'),
                    textField({
                        placeholder: 'https://remote-host',
                        field: 'remoteHost',
                        model: this.model,
                        onCommit: this.onCommit,
                        width: 150
                    }),
                    button({
                        text: 'Load Diff',
                        onClick: this.onLoadDiffClick
                    })
                ]
            })
            // message({model: model.messageModel}),
            // loadMask({model: model.loadModel})
        ];
    }
    
    onCommit = () => {
        this.model.loadAsync();
    }

    onLoadDiffClick = () => {
        this.model.loadAsync();
    }

    onCloseClick = () => {
        this.model.setIsOpen(false);
    }
}

export const configDiffer = elemFactory(ConfigDiffer);
