/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {forOwn} from 'lodash';
import {observable, setter, toJS} from 'hoist/mobx';
import {ChartModel} from 'hoist/highcharts';

export class VisitsModel {

    @observable @setter startDate = 20150101;
    @observable @setter endDate = 20180228;

    chartModel = new ChartModel({
        config: {
            chart: {type: 'column'},
            title: {text: 'Unique Visits'},
            xAxis: {
                type: 'datetime',
                units: [['day', [1]], ['week', [1]], ['month', [1]]]
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
            // params will also take a user name, cannot be set to null, better to not pass one at all.
            params: {
                startDate: this.startDate, // piq defaults to a year ago from today. implement this later
                endDate: this.endDate // piq defaults to a year ago from today. implement this later
            },
        }).then(data => {
            this.chartModel.setSeries(this.getSeriesData(data)) // still getting the mobx warning
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
            data.push([moment(v).valueOf(), k])
        });

        return  [{data}]
    }

}