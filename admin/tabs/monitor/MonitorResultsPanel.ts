/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {filler, hbox, label, placeholder, tileFrame} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, modalToggleButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import {errorMessage} from '../../../desktop/cmp/error';
import {MonitorResultsModel} from './MonitorResultsModel';
import './MonitorResultsPanel.scss';
import {tile} from './Tile';

export const monitorResultsPanel = hoistCmp.factory({
    model: creates(MonitorResultsModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            className: 'xh-monitor-results-panel',
            tbar: tbar(),
            item: body(),
            modelConfig: {
                modalSupport: {
                    width: '100vw',
                    height: '100vh'
                },
                collapsible: false,
                resizable: false
            }
        });
    }
});

const body = hoistCmp.factory<MonitorResultsModel>(({model}) => {
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
        minTileHeight: 150,
        items: results.map(info => tile({info}))
    });
});

const tbar = hoistCmp.factory<MonitorResultsModel>(({model}) => {
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
        hbox({
            className: getClassName(!failed),
            items: [
                toolbarSep(),
                Icon.error({prefix: 'fas', className: 'xh-red'}),
                label(`${failed} failed`)
            ]
        }),
        hbox({
            className: getClassName(!warned),
            items: [
                toolbarSep(),
                Icon.warning({prefix: 'fas', className: 'xh-orange'}),
                label(`${warned} warned`)
            ]
        }),
        hbox({
            className: getClassName(!passed),
            items: [
                toolbarSep(),
                Icon.checkCircle({prefix: 'fas', className: 'xh-green'}),
                label(`${passed} passed`)
            ]
        }),
        hbox({
            className: getClassName(!inactive),
            items: [
                toolbarSep(),
                Icon.disabled({prefix: 'fas', className: 'xh-gray'}),
                label(`${inactive} inactive`)
            ]
        }),
        filler(),
        relativeTimestamp({bind: 'lastRun'}),
        '-',
        modalToggleButton()
    );
});
