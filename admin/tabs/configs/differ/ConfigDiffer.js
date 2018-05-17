/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, XH} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {filler, fragment} from 'hoist/layout';
import {grid} from 'hoist/cmp/grid';
import {comboField, label, message, panel, toolbar} from 'hoist/cmp';

import {configDifferDetail} from './ConfigDifferDetail';

@HoistComponent()
export class ConfigDiffer extends Component {

    render() {
        const {model} = this,
            {detailModel} = model;
        return fragment(
            dialog({
                isOpen: model.isOpen,
                canOutsideClickClose: false,
                onClose: this.onCloseClick,
                style: {height: 600, width: '50%'},
                item: this.getContents()
            }),
            configDifferDetail({model: detailModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    getContents() {
        const model = this.model;
        return panel({
            tbar: toolbar(
                label('Compare w/Remote'),
                filler(),
                label('Compare with:'),
                comboField({
                    model,
                    placeholder: 'https://remote-host/',
                    field: 'remoteHost',
                    width: 200,
                    options: XH.getConf('xhAppInstances')
                }),
                button({
                    text: 'Load Diff',
                    intent: 'primary',
                    onClick: this.onLoadDiffClick
                })
            ),
            items: [
                grid({
                    model: model.gridModel,
                    agOptions: {
                        onRowDoubleClicked: this.onRowDoubleClicked,
                        popupParent: null
                    }
                }),
                message({model: model.messageModel})
            ],
            bbar: toolbar(
                filler(),
                button({
                    text: 'Close',
                    onClick: this.onCloseClick
                })
            )
        });
    }

    onLoadDiffClick = () => {
        this.model.loadAsync();
    }

    onCloseClick = () => {
        this.model.close();
    }

    onRowDoubleClicked = (e) => {
        this.model.detailModel.open(e.data);
    }
}
export const configDiffer = elemFactory(ConfigDiffer);
