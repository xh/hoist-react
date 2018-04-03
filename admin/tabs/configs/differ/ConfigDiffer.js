/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {box, frame} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {label, textField, toolbar} from 'hoist/cmp';

@hoistComponent()
export class ConfigDiffer extends Component {

    render() {
        return box(
            dialog({
                title: 'Config Differ',
                isOpen: this.model.isOpen,
                isCloseButtonShown: true,
                onClose: this.onCloseClick,
                style: {height: 600},
                items: this.getDialogItems()
            }),
            dialog({
                title: 'Detail',
                isOpen: this.model.detailIsOpen
            })
        );
    }

    //------------------------
    // Implementation
    //------------------------
    getDialogItems() {
        return [
            frame(
                grid({
                    model: this.model.gridModel,
                    gridOptions: {onRowDoubleClicked: this.onRowDoubleClicked}
                })
            ),
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

    onRowDoubleClicked = (e) => {
        this.model.showDiffDetail(e.data);
    }
}

export const configDiffer = elemFactory(ConfigDiffer);
