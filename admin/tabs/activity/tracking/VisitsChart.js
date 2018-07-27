/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory, CollapseSupport} from '@xh/hoist/core';
import {dayField, textField} from '@xh/hoist/desktop/cmp/form';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {refreshButton} from '@xh/hoist/desktop/cmp/button';
import {chart} from '@xh/hoist/desktop/cmp/chart';
import {Icon} from '@xh/hoist/icon';

@HoistComponent()
@CollapseSupport
export class VisitsChart extends Component {
    
    render() {
        return panel({
            icon: Icon.users(),
            title: 'Unique Daily Visitors',
            item: chart({model: this.model.chartModel}),
            collapseModel
            onCollapsedChange
            bbar: this.renderToolbar()
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    renderToolbar() {
        const model = this.model;
        return toolbar(
            this.dayField({field: 'startDate'}),
            Icon.angleRight(),
            this.dayField({field: 'endDate'}),
            textField({
                model,
                field: 'username',
                placeholder: 'Username',
                onCommit: this.onCommit,
                width: 120
            }),
            refreshButton({model})
        );
    }

    dayField(args) {
        return dayField({
            model: this.model,
            onCommit: this.onCommit,
            popoverPosition: 'top-left',
            width: 100,
            ...args
        });
    }

    onCommit = () => {
        this.model.loadAsync();
    }
}

export const visitsChart = elemFactory(VisitsChart);