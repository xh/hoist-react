/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {trimEnd} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {box, frame} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {label, textField, toolbar} from 'hoist/cmp';

import {configDifferDetail} from './ConfigDifferDetail';

@hoistComponent()
export class ConfigDiffer extends Component {

    render() {
        const model = this.model,
            detailModel = model.detailModel;
        return box(
            dialog({
                title: 'Config Differ',
                isOpen: model.isOpen,
                isCloseButtonShown: true,
                onClose: this.onCloseClick,
                style: {height: 600},
                items: this.getDialogItems()
            }),
            configDifferDetail({model: detailModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    getDialogItems() {
        const model = this.model;
        return [
            frame(
                grid({
                    model: model.gridModel,
                    gridOptions: {onRowDoubleClicked: this.onRowDoubleClicked}
                })
            ),
            toolbar({
                items: [
                    label('Compare with:'),
                    textField({
                        width: 150,
                        placeholder: 'https://remote-host',
                        onChange: this.onRemoteHostChange,
                        onCommit: this.onCommit,
                        value: model.remoteHost
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

    onRemoteHostChange = (remoteHost) => {
        const host = trimEnd(remoteHost, '/');
        this.model.setRemoteHost(host);
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
        this.model.detailModel.showDetail(e.data);
    }
}

export const configDiffer = elemFactory(ConfigDiffer);
