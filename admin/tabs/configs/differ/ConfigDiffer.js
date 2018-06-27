/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button, dialog} from '@xh/hoist/kit/blueprint';
import {filler, fragment, panel} from '@xh/hoist/cmp/layout';
import {grid} from '@xh/hoist/cmp/grid';
import {comboField, label} from '@xh/hoist/cmp/form';
import {toolbar} from '@xh/hoist/cmp/toolbar';

import {configDifferDetail} from './ConfigDifferDetail';

/**
 * @private
 */
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
                style: {height: 600, width: '80%'},
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
                    options: XH.getConf('xhAppInstances').filter(it => it != window.location.origin)
                }),
                button({
                    text: 'Load Diff',
                    intent: 'primary',
                    onClick: this.onLoadDiffClick
                })
            ),
            item: grid({
                model: model.gridModel,
                onRowDoubleClicked: this.onRowDoubleClicked,
                agOptions: {
                    popupParent: null
                }
            }),
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
