/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';
import {vframe} from 'hoist/layout';

import {activityGridToolbar} from './ActivityGridToolbar';

@hoistComponent()
export class ActivityGrid extends Component {
    render() {
        return vframe(
            activityGridToolbar({model: this.model}),
            grid({model: this.model.gridModel})
        );
    }
}
export const activityGrid = elemFactory(ActivityGrid);
