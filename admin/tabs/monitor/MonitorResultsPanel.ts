/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {creates, hoistCmp} from '@xh/hoist/core';
import {placeholder, tileFrame} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {isEmpty} from 'lodash';

import './MonitorResultsPanel.scss';
import {MonitorResultsModel} from './MonitorResultsModel';
import {monitorResultsToolbar} from './MonitorResultsToolbar';
import {tile} from './Tile';
import {errorMessage} from '../../../desktop/cmp/error';

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

const body = hoistCmp.factory<MonitorResultsModel>(
    ({model}) => {
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
            items: results.map(check => tile({check}))
        });
    }
);
