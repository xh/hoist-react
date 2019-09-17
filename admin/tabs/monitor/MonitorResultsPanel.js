/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, creates} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';

import {monitorResultsToolbar} from './MonitorResultsToolbar';
import {monitorResultsDisplay} from './MonitorResultsDisplay';
import {MonitorResultsModel} from './MonitorResultsModel';

import './MonitorResultsPanel.scss';

export const MonitorResultsPanel = hoistCmp({
    model: creates(MonitorResultsModel),

    render({model}) {
        return panel({
            ref: model.viewRef,
            mask: model.loadModel,
            className: 'xh-monitor-results-panel',
            tbar: monitorResultsToolbar(),
            item: monitorResultsDisplay()
        });
    }
});