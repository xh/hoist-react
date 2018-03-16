/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {forOwn} from 'lodash';
import {observable, setter} from 'hoist/mobx';
import {ChartModel} from 'hoist/highcharts';
import {fmtDate} from 'hoist/format';

export class VisitsChartModel {

    @observable @setter startDate = moment().subtract(3, 'months').toDate();
    @observable @setter endDate =  new Date();
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
        const {startDate, endDate, username} = this;

        if ((!this.isValidDate(startDate)) || !this.isValidDate(endDate)) return;


        return XH.fetchJson({
            url: 'trackLogAdmin/dailyVisitors',
            params: {
                startDate: fmtDate(startDate, 'YYYYMMDD'),
                endDate: fmtDate(endDate, 'YYYYMMDD'),
                username: username
            }
        }).then(data => {
            this.chartModel.setSeries(this.getSeriesData(data));
        }).catchDefault();
    }

    //----------------
    // Implementation
    //----------------
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