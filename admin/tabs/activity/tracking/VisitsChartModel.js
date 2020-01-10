/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtDate} from '@xh/hoist/format';
import {bindable, comparer} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {forOwn} from 'lodash';

@HoistModel
@LoadSupport
export class VisitsChartModel {

    @bindable.ref startDate = LocalDate.today().subtract(3, 'months');
    @bindable.ref endDate = LocalDate.today();
    @bindable username = '';

    @managed
    chartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'column'},
            plotOptions: {
                column: {animation: false}
            },
            legend: {enabled: false},
            title: {text: null},
            xAxis: {
                type: 'datetime',
                units: [['day', [1]], ['week', [2]], ['month', [1]]],
                labels: {
                    formatter: function() {return fmtDate(this.value, 'D MMM')}
                }
            },
            yAxis: {
                title: {
                    text: 'Unique Visits'
                }
            }
        }
    });

    constructor() {
        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural
        });
    }

    async doLoadAsync(loadSpec) {
        const params = this.getParams();
        if (!params.startDate || !params.endDate) return;

        return XH.fetchJson({
            url: 'trackLogAdmin/dailyVisitors',
            params,
            loadSpec
        }).then(data => {
            this.chartModel.setSeries(this.getSeriesData(data));
        }).catchDefault();
    }

    //----------------
    // Implementation
    //----------------
    getParams() {
        const {endDate, startDate, username} = this;
        return {startDate, endDate, username};
    }

    getSeriesData(visits) {
        const data = [];

        forOwn(visits, (v, k) => {
            data.push([LocalDate.get(k).timestamp, v]);
        });

        return [{data}];
    }
}
