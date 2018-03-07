/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {forOwn} from 'lodash';
import {action, observable, setter} from 'hoist/mobx';
import {ChartModel} from 'hoist/highcharts';
import {fmtDate} from 'hoist/format';

export class VisitsChartModel {


    @observable startDate = moment().subtract(3, 'months').toDate();
    @observable endDate =  moment().toDate();
    @observable @setter username = '';

    chartModel = new ChartModel({
        config: {
            chart: {type: 'column'},
            legend: {
                enabled: false
            },
            title: {text: null},
            xAxis: {
                type: 'datetime',
                units: [['day', [1]], ['week', [2]], ['month', [1]]],
                labels: {
                    formatter: function() {return fmtDate(this.value)}
                }
            },
            yAxis: {
                title: {
                    text: 'Unique Visits'
                }
            }
        }
    });

    async loadAsync() {
        return XH.fetchJson({
            url: 'trackLogAdmin/dailyVisitors',
            params: {
                startDate: fmtDate(this.startDate, 'YYYYMMDD'),
                endDate: fmtDate(this.endDate, 'YYYYMMDD'),
                username: this.username
            }
        }).then(data => {
            this.chartModel.setSeries(this.getSeriesData(data));
        }).catchDefault({
            message: 'Failed to fetch daily visits'
        });
    }

    //----------------
    // Implementation
    //----------------
    getSeriesData(visits) {
        const data = [];

        forOwn(visits, (k, v) => {
            data.push([moment(v).valueOf(), k]);
        });

        return [{data}];
    }

    @action
    setStartDate(date) {
        this.startDate = date;
        this.loadAsync();
    }

    @action
    setEndDate(date) {
        this.endDate = date;
        this.loadAsync();
    }

}