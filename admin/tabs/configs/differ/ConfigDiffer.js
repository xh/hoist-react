/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {box} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {label, message, comboField, toolbar} from 'hoist/cmp';

import {configDifferDetail} from './ConfigDifferDetail';

@hoistComponent()
export class ConfigDiffer extends Component {

    render() {
        const model = this.model,
            detailModel = model.detailModel;
        return box(
            dialog({
                title: 'Compare w/Remote',
                isOpen: model.isOpen,
                isCloseButtonShown: true,
                canOutsideClickClose: false,
                onClose: this.onCloseClick,
                style: {height: 600, width: '50%'},
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
            grid({
                model: model.gridModel,
                gridOptions: {
                    onRowDoubleClicked: this.onRowDoubleClicked,
                    overlayNoRowsTemplate: model.noRowsTemplate
                }
            }),
            toolbar({
                items: [
                    label('Compare with:'),
                    comboField({
                        model,
                        field: 'remoteHost',
                        options: [...XH.getConf('xhAppInstances')]
                    }),
                    button({
                        text: 'Load Diff',
                        onClick: this.onLoadDiffClick
                    })
                ]
            }),
            message({model: model.messageModel})
            // loadMask({model: model.loadModel})
        ];
    }

    onLoadDiffClick = () => {
        this.model.loadAsync();
    }

    onCloseClick = () => {
        this.model.close();
    }

    onRowDoubleClicked = (e) => {
        this.model.detailModel.showDetail(e.data);
    }
}

export const configDiffer = elemFactory(ConfigDiffer);
