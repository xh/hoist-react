/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {creates, hoistCmp} from '@xh/hoist/core';
import {placeholder} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tilingContainer} from '@xh/hoist/cmp/tile';
import {isEmpty} from 'lodash';

import './MonitorResultsPanel.scss';
import {MonitorResultsModel} from './MonitorResultsModel';
import {monitorResultsToolbar} from './MonitorResultsToolbar';
import {tile} from './Tile';

export const monitorResultsPanel = hoistCmp.factory({
    model: creates(MonitorResultsModel),

    render({model}) {
        return panel({
            ref: model.viewRef,
            mask: 'onLoad',
            className: 'xh-monitor-results-panel',
            tbar: monitorResultsToolbar(),
            item: body()
        });
    }
});

const body = hoistCmp.factory(
    ({model}) => {
        if (isEmpty(model.results)) {
            return placeholder('No monitors configured for this application.');
        }

        return tilingContainer({
            model,
            bind: 'results',
            content: tile,
            spacing: 10,
            desiredRatio: 3,
            minTileWidth: 300,
            maxTileWidth: 600,
            minTileHeight: 160,
            maxTileHeight: 160
        });
    }
);
