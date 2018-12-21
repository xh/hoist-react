/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/blueprint';
import {box, filler, fragment} from '@xh/hoist/cmp/layout';
import {grid} from '@xh/hoist/cmp/grid';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {select} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {identity} from 'lodash';

import {configDifferDetail} from './ConfigDifferDetail';

/**
 * @private
 */
@HoistComponent
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
        const model = this.model,
            gridModel = model.gridModel,
            store = gridModel.store;

        return panel({
            tbar: toolbar(
                box(<b>Configuration Comparison</b>),
                filler(),
                box('Compare with:'),
                select({
                    model,
                    field: 'remoteHost',
                    placeholder: 'https://remote-host/',
                    enableCreate: true,
                    createMessageFn: identity,
                    width: 250,
                    options: XH.getConf('xhAppInstances').filter(it => it != window.location.origin)
                }),
                button({
                    text: 'Load Diff',
                    intent: 'primary',
                    disabled: !model.remoteHost,
                    onClick: this.onLoadDiffClick
                })
            ),
            item: panel({
                mask: mask({
                    isDisplayed: !model.remoteHost || !store.count,
                    message: store.allCount ? 'All configs match!' : 'Enter a remote host for comparison.'
                }),
                item: grid({
                    model: gridModel,
                    onRowDoubleClicked: this.onRowDoubleClicked,
                    agOptions: {
                        popupParent: null
                    }
                })
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
