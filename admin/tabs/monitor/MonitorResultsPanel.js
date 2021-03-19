/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {creates, hoistCmp} from '@xh/hoist/core';
import {placeholder, tilingFrame} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
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
        const {results} = model;

        if (isEmpty(results)) {
            return placeholder('No monitors configured for this application.');
        }

        return tilingFrame({
            spacing: 10,
            desiredRatio: 3,
            minTileWidth: 300,
            maxTileWidth: 600,
            minTileHeight: 160,
            maxTileHeight: 160,
            items: results.map(check => tile({check}))
        });
    }
);
