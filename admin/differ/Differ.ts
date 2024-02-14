/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, fragment, frame, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon/Icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {identity, startCase} from 'lodash';
import {differDetail} from './DifferDetail';
import {DifferModel} from './DifferModel';
import {storeFilterField} from '../../cmp/store';

export const differ = hoistCmp.factory({
    model: uses(DifferModel),

    render({model}) {
        return fragment(
            dialog({
                title: `${startCase(model.displayName)} Differ`,
                isOpen: true,
                canOutsideClickClose: false,
                onClose: () => model.parentModel.closeDiffer(),
                style: {height: 600, width: '80%'},
                item: contents()
            }),
            differDetail()
        );
    }
});

const contents = hoistCmp.factory<DifferModel>(({model}) => {
    return panel({
        tbar: tbar(),
        item: model.hasLoaded
            ? grid({
                  agOptions: {popupParent: null}
              })
            : frame({
                  item: `No ${model.displayName}s loaded for comparison.`,
                  padding: 10
              }),
        bbar: bbar(),
        mask: 'onLoad'
    });
});

const tbar = hoistCmp.factory<DifferModel>(({model}) => {
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
            icon: Icon.copy(),
            getCopyText: () => model.fetchLocalConfigsAsync(),
            successMessage: `${startCase(
                model.displayName
            )}s copied to clipboard - ready to paste into the diff tool on another instance for comparison.`
        })
    );
});

const bbar = hoistCmp.factory<DifferModel>(({model}) => {
    return toolbar(
        storeFilterField({
            matchMode: 'any'
        }),
        filler(),
        recordActionBar({
            actions: [model.applyRemoteAction],
            selModel: model.gridModel.selModel,
            buttonProps: {intent: 'primary'}
        }),
        toolbarSep({omit: model.readonly}),
        button({
            text: 'Close',
            onClick: () => model.parentModel.closeDiffer()
        })
    );
});
