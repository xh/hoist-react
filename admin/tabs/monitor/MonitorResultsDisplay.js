/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {tile} from './Tile';
import {isEmpty} from 'lodash';

export const monitorResultsDisplay = hoistCmp.factory(
    ({model}) => {
        const {results} = model;
        return hbox({
            className: 'xh-monitor-status-display',
            items: isEmpty(results) ?
                'No monitors configured for this application.' :
                model.results.map((check, idx) => tile({key: `tile-${idx}`, check}))
        });
    }
);
