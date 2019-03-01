/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import moment from 'moment';
import {forOwn} from 'lodash';
import {XH, HoistModel, LoadSupport, managed} from '@xh/hoist/core';
import {observable, action, comparer} from '@xh/hoist/mobx';
import {ChartModel} from '@xh/hoist/desktop/cmp/chart';
import {fmtDate} from '@xh/hoist/format';

@HoistModel
@LoadSupport
export class VisitsChartModel {

    @observable startDate = moment().subtract(3, 'months').toDate();
    @observable endDate = new Date();
    @observable username = '';
    
    @managed
    chartModel = new ChartModel({
        config: {
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
            run: this.loadAsync,
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

    @action
    setStartDate(date) {
        this.startDate = date;
    }

    @action
    setEndDate(date) {
        this.endDate = date;
    }

    @action
    setUsername(username) {
        this.username = username;
    }

    //----------------
    // Implementation
    //----------------
    getParams() {
        const {endDate, startDate, username} = this;

        return {
            startDate: this.isValidDate(startDate) ? fmtDate(startDate, 'YYYYMMDD') : null,
            endDate: this.isValidDate(endDate) ? fmtDate(endDate, 'YYYYMMDD') : null,
            username
        };
    }

    isValidDate(date) {
        return date && date.toString() !== 'Invalid Date';
    }

    getSeriesData(visits) {
        const data = [];

        forOwn(visits, (k, v) => {
            data.push([moment(v).valueOf(), k]);
        });

        return [{data}];
    }
}