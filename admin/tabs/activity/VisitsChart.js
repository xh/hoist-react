/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from 'hoist/core';
import {dayField, label, textField} from 'hoist/cmp/form';
import {panel} from 'hoist/cmp/layout';
import {toolbar} from 'hoist/cmp/toolbar';
import {refreshButton} from 'hoist/cmp/button';
import {chart} from 'hoist/cmp/chart';
import {Icon} from 'hoist/icon';

@HoistComponent()
export class VisitsChart extends Component {

    render() {
        return panel({
            icon: Icon.users(),
            title: 'Unique Daily Visitors',
            item: chart({model: this.model.chartModel}),
            bbar: this.renderToolbar()
        });
    }

    renderCollapsed() {
        return toolbar(Icon.users(), label('Unique Daily Visitors'));
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