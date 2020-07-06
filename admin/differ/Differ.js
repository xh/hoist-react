/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, fragment, frame, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon/Icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {identity} from 'lodash';
import {differDetail} from './DifferDetail';
import {DifferModel} from './DifferModel';

export const differ = hoistCmp.factory({
    model: uses(DifferModel),

    render({model}) {
        return fragment(
            dialog({
                title: `${model.entityName} Differ`,
                isOpen: model.isOpen,
                canOutsideClickClose: false,
                onClose: () => model.close(),
                style: {height: 600, width: '80%'},
                item: contents()
            }),
            differDetail()
        );
    }
});

const contents = hoistCmp.factory(
    ({model}) => {
        return panel({
            tbar: tbar(),
            item: model.hasLoaded ?
                grid({
                    onRowDoubleClicked: (e) => model.detailModel.open(e.data),
                    agOptions: {popupParent: null}
                }) :
                frame({
                    item: 'Select/enter a remote host to compare against...',
                    padding: 10
                }),
            bbar: [
                filler(),
                button({
                    text: 'Close',
                    onClick: () => model.close()
                })
            ],
            mask: 'onLoad'
        });
    }
);

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            span('Compare with'),
            select({
                bind: 'remoteHost',
                placeholder: 'https://remote-host/',
                enableCreate: true,
                createMessageFn: identity,
                width: 250,
                options: model.remoteHosts
            }),
            button({
                text: 'Load Diff',
                icon: Icon.diff(),
                intent: 'primary',
                disabled: !model.remoteHost,
                onClick: () => model.loadAsync()
            })
        );
    }
);