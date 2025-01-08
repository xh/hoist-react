/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {monitorEditorDialog} from '@xh/hoist/admin/tabs/monitor/editor/MonitorEditorDialog';
import {MonitorTabModel} from '@xh/hoist/admin/tabs/monitor/MonitorTabModel';
import {tile} from '@xh/hoist/admin/tabs/monitor/Tile';
import {filler, hbox, label, placeholder, tileFrame} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/cmp/error';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import './MonitorTab.scss';

export const monitorTab = hoistCmp.factory({
    model: creates(MonitorTabModel),
    render() {
        const enabled = XH.getConf('xhEnableMonitoring', true);
        if (!enabled)
            return errorMessage({error: 'Monitoring disabled via xhEnableMonitor config.'});

        return panel({
            mask: 'onLoad',
            className: 'xh-monitor-tab',
            tbar: tbar(),
            items: [body(), monitorEditorDialog()]
        });
    }
});

const body = hoistCmp.factory<MonitorTabModel>(({model}) => {
    const {results, lastLoadException} = model;

    if (lastLoadException) {
        return errorMessage({error: lastLoadException});
    }

    if (isEmpty(results)) {
        return placeholder('No monitors configured for this application.');
    }

    return tileFrame({
        spacing: 10,
        desiredRatio: 3,
        minTileWidth: 150,
        minTileHeight: 180,
        items: results.map(results => tile({results}))
    });
});

const tbar = hoistCmp.factory<MonitorTabModel>(({model}) => {
    const {passed, warned, failed, inactive, results} = model,
        getClassName = hide => {
            return `xh-monitor-result-count ${hide ? 'xh-monitor-result-count--hidden' : ''}`;
        };

    return toolbar(
        button({
            icon: Icon.refresh(),
            text: 'Run all now',
            disabled: isEmpty(results),
            omit: AppModel.readonly,
            onClick: () => model.forceRunAllMonitorsAsync()
        }),
        '-',
        button({
            text: 'Configure',
            icon: Icon.gear(),
            onClick: () => (model.showEditorDialog = true)
        }),
        '-',
        switchInput({
            label: 'Show inactive',
            bind: 'showInactive'
        }),
        hbox({
            className: getClassName(!failed),
            items: [
                toolbarSep(),
                Icon.error({prefix: 'fas', intent: 'danger'}),
                label(`${failed} failed`)
            ]
        }),
        hbox({
            className: getClassName(!warned),
            items: [
                toolbarSep(),
                Icon.warning({prefix: 'fas', intent: 'warning'}),
                label(`${warned} warned`)
            ]
        }),
        hbox({
            className: getClassName(!passed),
            items: [
                toolbarSep(),
                Icon.checkCircle({prefix: 'fas', intent: 'success'}),
                label(`${passed} passed`)
            ]
        }),
        hbox({
            className: getClassName(!inactive),
            items: [
                toolbarSep(),
                Icon.disabled({prefix: 'fas', className: 'xh-text-color-muted'}),
                label(`${inactive} inactive`)
            ]
        }),
        filler(),
        relativeTimestamp({bind: 'lastRun'})
    );
});
