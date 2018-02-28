/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe} from 'hoist/layout';
import {collapsible} from 'hoist/cmp';
import {observer} from 'hoist/mobx';
import {numberRenderer} from 'hoist/format';
import {baseCol} from 'hoist/columns/Core';
import {dateTimeCol} from 'hoist/columns/DatesTimes';

import {usernameCol} from '../../columns/Columns';

@hoistComponent()
export class ActivityPanel extends Component {

    store = new UrlStore({
        url: 'trackLogAdmin',
        recordSpec: {
            fields: [
                'severity', 'dateCreated', 'msg', 'category', 'device',
                'browser', 'data', 'impersonating', 'elapsed'
            ]
        }
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            baseCol({field: 'severity', width: 60}),
            dateTimeCol({field: 'dateCreated', text: 'Date Created'}),
            usernameCol(),
            baseCol({field: 'msg', text: 'Message', width: 60}),
            baseCol({field: 'category', text: 'Category', width: 100}),
            baseCol({field: 'device', text: 'Device', width: 60}),
            baseCol({field: 'browser', text: 'Browser', width: 100}),
            baseCol({field: 'data', text: 'Data', flex: 1}),
            baseCol({field: 'impersonating', text: 'Impersonating', width: 120}),
            baseCol({
                field: 'elapsed',
                text: 'Elapsed (ms)',
                width: 60,
                valueFormatter: numberRenderer({precision: 0})
            })
        ]
    });

    chartModel = new ChartModel({
        config: {
            chart: {type: 'bar'},
            title: {text: 'Fruit Consumption'},
            xAxis: {
                categories: ['Apples', 'Bananas', 'Oranges']
            },
            yAxis: {
                title: {
                    text: 'Fruit eaten'
                }
            }
        },
        series: [{
            name: 'Jane',
            data: [1, 0, 4]
        }, {
            name: 'John',
            data: [5, 7, 3]
        }]
    });

    render() {
        return vframe(
            grid({model: this.gridModel}),
            collapsible({
                side: 'bottom',
                contentSize: 250,
                item: chart({model: this.chartModel})
            })
        );
    }

    loadAsync() {
        return this.store.loadAsync();
    }
}
