/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {filler, fragment} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {comboField, label, message, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {configDifferDetail} from './ConfigDifferDetail';

@hoistComponent()
export class ConfigDiffer extends Component {

    render() {
        const model = this.model,
            detailModel = model.detailModel;
        return fragment(
            dialog({
                isOpen: model.isOpen,
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
            toolbar(
                label('Compare w/Remote'),
                filler(),
                label('Compare with:'),
                comboField({
                    model,
                    placeholder: 'https://remote-host/',
                    field: 'remoteHost',
                    options: XH.getConf('xhAppInstances')
                }),
                button({
                    text: 'Load Diff',
                    intent: 'success',
                    onClick: this.onLoadDiffClick
                })
            ),
            grid({
                model: model.gridModel,
                gridOptions: {
                    onRowDoubleClicked: this.onRowDoubleClicked,
                    overlayNoRowsTemplate: 'Please enter remote host for comparison',
                    popupParent: null
                }
            }),
            toolbar(
                filler(),
                button({
                    text: 'Close',
                    intent: 'primary',
                    onClick: this.onCloseClick
                })
            ),
            message({model: model.messageModel})
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
