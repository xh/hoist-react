/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, fragment, frame, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon/Icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {identity, startCase} from 'lodash';
import {differDetail} from './DifferDetail';
import {DifferModel} from './DifferModel';

export const differ = hoistCmp.factory({
    model: uses(DifferModel),

    /** @param {DifferModel} model */
    render({model}) {
        return fragment(
            dialog({
                title: `${startCase(model.displayName)} Differ`,
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
    /** @param {DifferModel} model */
    ({model}) => {
        return panel({
            tbar: tbar(),
            item: model.hasLoaded ?
                grid({
                    onRowDoubleClicked: (e) => model.detailModel.open(e.data),
                    agOptions: {popupParent: null}
                }) :
                frame({
                    item: `No ${model.displayName}s loaded for comparison.`,
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
    /** @param {DifferModel} model */
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
                text: 'Diff from Remote',
                icon: Icon.diff(),
                intent: 'primary',
                disabled: !model.remoteHost,
                onClick: () => model.diffFromRemote()
            }),
            span('- or -'),
            button({
                text: 'Diff from Clipboard',
                icon: Icon.paste(),
                intent: 'primary',
                onClick: () => model.diffFromClipboardAsync()
            }),
            filler(),
            clipboardButton({
                text: `Copy ${startCase(model.displayName)}s`,
                intent: 'primary',
                icon: Icon.copy(),
                getCopyText: () => model.fetchLocalConfigsAsync(),
                successMessage: `${startCase(model.displayName)}s copied to clipboard - ready to paste into the diff tool on another instance for comparison.`
            })
        );
    }
);
