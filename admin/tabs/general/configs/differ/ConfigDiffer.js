/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/blueprint';
import {box, filler, fragment} from '@xh/hoist/cmp/layout';
import {grid} from '@xh/hoist/cmp/grid';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {select} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {identity} from 'lodash';

import {ConfigDifferModel} from './ConfigDifferModel';
import {configDifferDetail} from './ConfigDifferDetail';

export const configDiffer = hoistCmp.factory({
    model: uses(ConfigDifferModel),

    render({model}) {
        return fragment(
            dialog({
                isOpen: model.isOpen,
                canOutsideClickClose: false,
                onClose: () => model.close(),
                style: {height: 600, width: '80%'},
                item: contents()
            }),
            configDifferDetail()
        );
    }
});

const contents = hoistCmp.factory(
    ({model}) => {
        const {store} = model.gridModel;
        return panel({
            tbar: [
                box(<b>Configuration Comparison</b>),
                filler(),
                box('Compare with:'),
                select({
                    bind: 'remoteHost',
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
                    onClick: () => model.loadAsync()
                })
            ],
            item: panel({
                mask: mask({
                    isDisplayed: !model.remoteHost || !store.count,
                    message: store.allCount ? 'All configs match!' : 'Enter a remote host for comparison.'
                }),
                item: grid({
                    onRowDoubleClicked: (e) => model.detailModel.open(e.data),
                    agOptions: {
                        popupParent: null
                    }
                })
            }),
            bbar: [
                filler(),
                button({
                    text: 'Close',
                    onClick: () => model.close()
                })
            ]
        });
    }
);