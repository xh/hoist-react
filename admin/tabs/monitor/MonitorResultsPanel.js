/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {monitorResultsDisplay} from './MonitorResultsDisplay';
import {MonitorResultsModel} from './MonitorResultsModel';
import {monitorResultsToolbar} from './MonitorResultsToolbar';
import './MonitorResultsPanel.scss';

export const monitorResultsPanel = hoistCmp.factory({
    model: creates(MonitorResultsModel),

    render({model}) {
        return panel({
            ref: model.viewRef,
            mask: 'onLoad',
            className: 'xh-monitor-results-panel',
            tbar: monitorResultsToolbar(),
            item: monitorResultsDisplay()
        });
    }
});